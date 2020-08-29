import {
  clamp8, parity8,
  add8, sub8
} from './bin-ops';
import './test-helper.js';

test('clamp8', () => {
  const [b, v] = clamp8(0x1ff);
  expect(b).toBe(0x0ff);
  expect(v).toBe(1);
});

test('parity8', () => {
  const even = parity8(3);
  const odd = parity8(2);

  expect(even).toBe(1);
  expect(odd).toBe(0);
});

test('add8', () => {
  let result;
  // let { a, s, z, h, p, v, n, c } = add8(0xff, 0x01);

  result = add8(0xff, 0x01);
  expect(result).toMatchStruct({
    a:0, s:0, z:1, h:1, p:1, v:0, n:0, c:1
  });

  result = add8(0x80, 0xff);
  expect(result).toMatchStruct({
    a:0x7f, s:0, z:0, h:0, p:0, v:1, n:0, c:1
  });
});

test('sub8', () => {
  let result;
  // let { a, s, z, h, p, v, n, c } = add8(0xff, 0x01);

  result = sub8(0x00, 0x01);
  expect(result).toMatchStruct({
    a:0xff, s:1, z:0, h:1, p:1, v:0, n:1, c:1
  });

  result = sub8(0x80, 0x01);
  expect(result).toMatchStruct({
    a:0x7f, s:0, z:0, h:1, p:0, v:1, n:1, c:0
  });

  result = sub8(0x01, 0x01);
  expect(result).toMatchStruct({
    a:0, s:0, z:1, h:0, p:1, v:0, n:1, c:0
  });
});