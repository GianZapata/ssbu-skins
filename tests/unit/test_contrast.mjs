import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../../src/app.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (name) => {
  const match = new RegExp('--color-' + name + ':\\s*(#[0-9a-fA-F]{6})\\s*;').exec(root);
  assert.ok(match, 'falta el token ' + name);
  return match[1];
};

const channel = (value) => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => channel(parseInt(hex.slice(index, index + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const text = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'raise'], ['mute', 'surface'], ['mute', 'raise'], ['dim', 'surface'], ['dim', 'raise'],
  ['actual', 'surface'], ['actual', 'actualbg'], ['pend', 'surface'], ['pend', 'pendbg'], ['risk', 'surface'],
];
const graphics = [['actual', 'surface'], ['dim', 'surface'], ['pend', 'surface'], ['pend', 'stage']];

test('el texto de la interfaz cumple 4.5:1 sobre sus fondos (WCAG AA)', () => {
  for (const [front, back] of text) {
    const value = ratio(token(front), token(back));
    assert.ok(value >= 4.5, front + ' sobre ' + back + ': ' + value.toFixed(2));
  }
});

test('los segmentos del medidor y los contornos cumplen 3:1 frente al fondo', () => {
  for (const [front, back] of graphics) {
    const value = ratio(token(front), token(back));
    assert.ok(value >= 3, front + ' sobre ' + back + ': ' + value.toFixed(2));
  }
});
