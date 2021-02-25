/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {asyncReplace} from '../../directives/async-replace.js';
import {render, html} from '../../lit-html.js';
import {TestAsyncIterable} from './test-async-iterable.js';
import {stripExpressionMarkers} from '../test-utils/strip-markers.js';
import {assert} from '@esm-bundle/chai';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Set Symbol.asyncIterator on browsers without it
if (typeof Symbol !== undefined && Symbol.asyncIterator === undefined) {
  Object.defineProperty(Symbol, 'Symbol.asyncIterator', {value: Symbol()});
}

suite('asyncReplace', () => {
  let container: HTMLDivElement;
  let iterable: TestAsyncIterable<unknown>;

  setup(() => {
    container = document.createElement('div');
    iterable = new TestAsyncIterable<unknown>();
  });

  test('replaces content as the async iterable yields new values (ChildPart)', async () => {
    render(html`<div>${asyncReplace(iterable)}</div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable.push('bar');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>bar</div>');
  });

  test('replaces content as the async iterable yields new values (AttributePart)', async () => {
    render(html`<div class="${asyncReplace(iterable)}"></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="foo"></div>'
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="bar"></div>'
    );
  });

  test('replaces content as the async iterable yields new values (PropertyPart)', async () => {
    render(html`<div .className=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="foo"></div>'
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="bar"></div>'
    );
  });

  test('replaces content as the async iterable yields new values (BooleanAttributePart)', async () => {
    render(html`<div ?hidden=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push(true);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div hidden=""></div>'
    );

    await iterable.push(false);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
  });

  test('replaces content as the async iterable yields new values (EventPart)', async () => {
    render(html`<div @click=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    let value;
    await iterable.push(() => (value = 1));
    (container.firstElementChild as HTMLDivElement)!.click();
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal(value, 1);

    await iterable.push(() => (value = 2));
    (container.firstElementChild as HTMLDivElement)!.click();
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal(value, 2);
  });

  test('clears the Part when a value is undefined', async () => {
    render(html`<div>${asyncReplace(iterable)}</div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable.push((undefined as unknown) as string);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
  });

  test('uses the mapper function', async () => {
    render(
      html`<div>${asyncReplace(iterable, (v, i) => html`${i}: ${v} `)}</div>`,
      container
    );
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>0: foo </div>'
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>1: bar </div>'
    );
  });

  test('renders new iterable over a pending iterable', async () => {
    const t = (iterable: any) => html`<div>${asyncReplace(iterable)}</div>`;
    render(t(iterable), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    const iterable2 = new TestAsyncIterable<string>();
    render(t(iterable2), container);

    // The last value is preserved until we receive the first
    // value from the new iterable
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable2.push('hello');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>'
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>'
    );
  });

  test('renders the same iterable even when the iterable new value is emitted at the same time as a re-render', async () => {
    const t = (iterable: any) => html`<div>${asyncReplace(iterable)}</div>`;
    let wait: Promise<void>;
    render(t(iterable), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    wait = iterable.push('hello');
    render(t(iterable), container);
    await wait;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>'
    );

    wait = iterable.push('bar');
    render(t(iterable), container);
    await wait;
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>bar</div>');
  });

  test('renders new value over a pending iterable', async () => {
    const t = (v: any) => html`<div>${v}</div>`;
    // This is a little bit of an odd usage of directives as values, but it
    // is possible, and we check here that asyncReplace plays nice in this case
    render(t(asyncReplace(iterable)), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    render(t('hello'), container);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>'
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>'
    );
  });

  test('does not render the first value if it is replaced first', async () => {
    async function* generator(delay: Promise<any>, value: any) {
      await delay;
      yield value;
    }

    const component = (value: any) => html`<p>${asyncReplace(value)}</p>`;
    const delay = (delay: number) =>
      new Promise((res) => setTimeout(res, delay));

    render(component(generator(delay(20), 'slow')), container);
    render(component(generator(delay(10), 'fast')), container);
    await delay(30);

    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>fast</p>');
  });

  test('does not render while disconnected', async () => {
    const component = (value: any) => html`<p>${asyncReplace(value)}</p>`;
    const part = render(component(iterable), container);
    await iterable.push('1');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
    part.setConnected(false);
    await iterable.push('2');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
    part.setConnected(true);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>2</p>');
    await iterable.push('3');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>3</p>');
  });
});
