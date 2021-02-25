/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Do not modify this file by hand!
// Re-generate this file by running lit-localize

import {html} from 'lit-html';

/* eslint-disable no-irregular-whitespace */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const templates = {
  lit: html`Hola <b><i>Galaxia!</i></b>`,
  lit_variables_1: (url: any, name: any) =>
    html`Hola ${name}, clic <a href="${url}">aquí</a>!`,
  string: `Hola Mundo!`,
  variables_1: (name: any) => `Hola ${name}!`,
  lit_variables_2: (x: any) => html`${x}y${x}y${x}`,
  lit_variables_3: (x: any) => html`<b>${x}</b>
    <i>y</i>
    <b>${x}</b>
    <i>y</i>
    <b>${x}</b>`,
};
