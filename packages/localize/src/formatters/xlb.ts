/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as xmldom from 'xmldom';
import * as glob from 'glob';
import * as fsExtra from 'fs-extra';
import * as pathlib from 'path';
import {Config} from '../config';
import {Locale} from '../locales';
import {Formatter} from './index';
import {KnownError} from '../error';
import {ProgramMessage, Message, Bundle, Placeholder} from '../messages';
import {
  getOneElementByTagNameOrThrow,
  getNonEmptyAttributeOrThrow,
} from './xml-utils';

/**
 * Parse an XLB XML file. These files contain translations organized using the
 * same message names that we originally requested.
 * Configuration for XLB interchange format.
 */
export interface XlbConfig {
  format: 'xlb';

  /**
   * Output path on disk to the XLB XML file that will be created containing all
   * messages extracted from the source. E.g. "data/localization/en.xlb".
   */
  outputFile: string;

  /**
   * Glob pattern of XLB XML files to read from disk containing translated
   * messages. E.g. "data/localization/*.xlb".
   *
   * See https://github.com/isaacs/node-glob#README for valid glob syntax.
   */
  translationsGlob: string;
}

/**
 * Create an XLB formatter from a main config object.
 */
export function xlbFactory(config: Config) {
  return new XlbFormatter(config);
}

/**
 * Formatter for XLB.
 */
class XlbFormatter implements Formatter {
  private config: Config;
  private xlbConfig: XlbConfig;

  constructor(config: Config) {
    if (config.interchange.format !== 'xlb') {
      throw new KnownError(
        `Internal error: expected interchange.format "xlb", ` +
          `got ${config.interchange.format}`
      );
    }
    this.config = config;
    this.xlbConfig = config.interchange;
  }

  /**
   * Read translations from all XLB files on disk that match the configured glob
   * pattern.
   */
  async readTranslations(): Promise<Array<Bundle>> {
    const files = await new Promise<string[]>((resolve, reject) =>
      glob(
        this.xlbConfig.translationsGlob,
        {cwd: this.config.baseDir, absolute: true},
        (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        }
      )
    );
    const bundles: Array<Promise<Bundle>> = [];
    for (const file of files) {
      bundles.push(
        (async () => {
          const xmlStr = await fsExtra.readFile(file, 'utf8');
          return this.parseXmb(xmlStr);
        })()
      );
    }
    return Promise.all(bundles);
  }

  /**
   * Parse the given XLB XML string and return its translations.
   */
  private parseXmb(xmlStr: string): Bundle {
    const doc = new xmldom.DOMParser().parseFromString(xmlStr);
    const bundle = getOneElementByTagNameOrThrow(doc, 'localizationbundle');
    const locale = getNonEmptyAttributeOrThrow(bundle, 'locale') as Locale;
    const msgNodes = doc.getElementsByTagName('msg');
    const messages: Message[] = [];
    for (let i = 0; i < msgNodes.length; i++) {
      const msg = msgNodes[i];
      const name = getNonEmptyAttributeOrThrow(msg, 'name');
      const contents: Array<string | Placeholder> = [];
      for (let j = 0; j < msg.childNodes.length; j++) {
        const child = msg.childNodes[j];
        if (child.nodeType === doc.TEXT_NODE) {
          contents.push(child.nodeValue || '');
        } else if (
          child.nodeType === doc.ELEMENT_NODE &&
          child.nodeName === 'ph'
        ) {
          const phText = child.childNodes[0];
          if (
            child.childNodes.length !== 1 ||
            !phText ||
            phText.nodeType !== doc.TEXT_NODE
          ) {
            throw new KnownError(`Expected <ph> to have exactly one text node`);
          }
          contents.push({untranslatable: phText.nodeValue || ''});
        } else {
          throw new KnownError(
            `Unexpected node in <msg>: ${child.nodeType} ${child.nodeName}`
          );
        }
      }
      messages.push({name, contents});
    }
    return {locale, messages};
  }

  /**
   * Write the source messages output file.
   */
  async writeOutput(sourceMessages: ProgramMessage[]): Promise<void> {
    const doc = new xmldom.DOMImplementation().createDocument('', '', null);
    const indent = (node: Element | Document, level = 0) =>
      node.appendChild(doc.createTextNode('\n' + Array(level + 1).join('  ')));
    doc.appendChild(
      doc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"')
    );
    indent(doc);
    const bundle = doc.createElement('localizationbundle');
    bundle.setAttribute('locale', this.config.sourceLocale);
    doc.appendChild(bundle);
    indent(bundle, 1);
    const messagesNode = doc.createElement('messages');
    bundle.appendChild(messagesNode);
    for (const {name, contents, descStack} of sourceMessages) {
      const messageNode = doc.createElement('msg');
      messageNode.setAttribute('name', name);
      if (descStack.length > 0) {
        messageNode.setAttribute('desc', descStack.join(' / '));
      }
      indent(messagesNode, 2);
      messagesNode.appendChild(messageNode);
      for (const content of contents) {
        if (typeof content === 'string') {
          messageNode.appendChild(doc.createTextNode(content));
        } else {
          const {untranslatable} = content;
          const ph = doc.createElement('ph');
          ph.appendChild(doc.createTextNode(untranslatable));
          messageNode.appendChild(ph);
        }
      }
    }
    indent(messagesNode, 1);
    indent(bundle);
    indent(doc);
    const serialized = new xmldom.XMLSerializer().serializeToString(doc);
    const filePath = this.config.resolve(this.xlbConfig.outputFile);
    const parentDir = pathlib.dirname(filePath);
    try {
      await fsExtra.ensureDir(parentDir);
    } catch (e) {
      throw new KnownError(
        `Error creating XLB directory: ${parentDir}\n` +
          `Do you have write permission?\n` +
          e.message
      );
    }
    try {
      await fsExtra.writeFile(filePath, serialized, 'utf8');
    } catch (e) {
      throw new KnownError(
        `Error creating XLB file: ${filePath}\n` +
          `Do you have write permission?\n` +
          e.message
      );
    }
  }
}
