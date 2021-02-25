/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {html, ChildPart, render, svg} from '../lit-html.js';
import {directive, Directive} from '../directive.js';
import {assert} from '@esm-bundle/chai';
import {stripExpressionComments} from './test-utils/strip-markers.js';
import {
  getDirectiveClass,
  insertPart,
  isDirectiveResult,
  isPrimitive,
  isTemplateResult,
  removePart,
  TemplateResultType,
} from '../directive-helpers.js';
import {classMap} from '../directives/class-map.js';

suite('directive-helpers', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
  });

  test('isPrimitive', () => {
    assert.isTrue(isPrimitive(null));
    assert.isTrue(isPrimitive(undefined));
    assert.isTrue(isPrimitive(true));
    assert.isTrue(isPrimitive(1));
    assert.isTrue(isPrimitive('a'));
    assert.isTrue(isPrimitive(Symbol()));

    // Can't polyfill this syntax:
    // assert.isTrue(isPrimitive(1n));

    assert.isFalse(isPrimitive({}));
    assert.isFalse(isPrimitive(() => {}));
  });

  test('isTemplateResult', () => {
    assert.isTrue(isTemplateResult(html``));
    assert.isTrue(isTemplateResult(svg``));
    assert.isTrue(isTemplateResult(html``, TemplateResultType.HTML));
    assert.isTrue(isTemplateResult(svg``, TemplateResultType.SVG));

    assert.isFalse(isTemplateResult(null));
    assert.isFalse(isTemplateResult(undefined));
    assert.isFalse(isTemplateResult({}));
    assert.isFalse(isTemplateResult(html``, TemplateResultType.SVG));
    assert.isFalse(isTemplateResult(svg``, TemplateResultType.HTML));
    assert.isFalse(isTemplateResult(null, TemplateResultType.HTML));
    assert.isFalse(isTemplateResult(undefined, TemplateResultType.HTML));
    assert.isFalse(isTemplateResult({}, TemplateResultType.HTML));
  });

  test('isDirectiveResult', () => {
    assert.isTrue(isDirectiveResult(classMap({})));

    assert.isFalse(isDirectiveResult(null));
    assert.isFalse(isDirectiveResult(undefined));
    assert.isFalse(isDirectiveResult({}));
  });

  test('getDirectiveClass', () => {
    assert.instanceOf(getDirectiveClass(classMap({}))?.prototype, Directive);
    assert.equal(getDirectiveClass(null), undefined);
    assert.equal(getDirectiveClass(undefined), undefined);
    assert.equal(getDirectiveClass({}), undefined);
  });

  test('insertPart', () => {
    class TestDirective extends Directive {
      render(v: unknown) {
        return v;
      }

      update(part: ChildPart, [v]: Parameters<this['render']>) {
        // Create two parts and remove the first, then the second to make sure
        // that removing the first doesn't move the second's markers. This
        // fails if the parts accidentally share a marker.
        const childPart2 = insertPart(part, undefined);
        const childPart1 = insertPart(part, undefined, childPart2);
        removePart(childPart1);
        removePart(childPart2);
        return v;
      }
    }
    const testDirective = directive(TestDirective);

    const go = (v: unknown) =>
      render(html`<div>${testDirective(v)}</div>`, container);

    go('A');
    assert.equal(stripExpressionComments(container.innerHTML), '<div>A</div>');
  });
});
