/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {AttributePart, noChange} from '../lit-html.js';
import {
  directive,
  Directive,
  DirectiveParameters,
  PartInfo,
  PartType,
} from '../directive.js';

/**
 * A key-value set of class names to truthy values.
 */
export interface ClassInfo {
  readonly [name: string]: string | boolean | number;
}

class ClassMap extends Directive {
  /**
   * Stores the ClassInfo object applied to a given AttributePart.
   * Used to unset existing values when a new ClassInfo object is applied.
   */
  previousClasses?: Set<string>;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.ATTRIBUTE ||
      partInfo.name !== 'class' ||
      (partInfo.strings?.length as number) > 2
    ) {
      throw new Error(
        'The `classMap` directive must be used in the `class` attribute ' +
          'and must be the only part in the attribute.'
      );
    }
  }

  render(classInfo: ClassInfo) {
    return Object.keys(classInfo)
      .filter((key) => classInfo[key])
      .join(' ');
  }

  update(part: AttributePart, [classInfo]: DirectiveParameters<this>) {
    // Remember dynamic classes on the first render
    if (this.previousClasses === undefined) {
      this.previousClasses = new Set();
      for (const name in classInfo) {
        if (classInfo[name]) {
          this.previousClasses.add(name);
        }
      }
      return this.render(classInfo);
    }

    const classList = part.element.classList;

    // Remove old classes that no longer apply
    // We use forEach() instead of for-of so that we don't require down-level
    // iteration.
    this.previousClasses.forEach((name) => {
      if (!(name in classInfo)) {
        classList.remove(name);
        this.previousClasses!.delete(name);
      }
    });

    // Add or remove classes based on their classMap value
    for (const name in classInfo) {
      // We explicitly want a loose truthy check of `value` because it seems
      // more convenient that '' and 0 are skipped.
      const value = !!classInfo[name];
      if (value !== this.previousClasses.has(name)) {
        if (value) {
          classList.add(name);
          this.previousClasses.add(name);
        } else {
          classList.remove(name);
          this.previousClasses.delete(name);
        }
      }
    }
    return noChange;
  }
}

/**
 * A directive that applies dynamic CSS classes.
 *
 * This must be used in the `class` attribute and must be the only part used in
 * the attribute. It takes each property in the `classInfo` argument and adds
 * the property name to the element's `classList` if the property value is
 * truthy; if the property value is falsey, the property name is removed from
 * the element's `class`.
 *
 * For example `{foo: bar}` applies the class `foo` if the value of `bar` is
 * truthy.
 *
 * @param classInfo
 */
export const classMap = directive(ClassMap);
