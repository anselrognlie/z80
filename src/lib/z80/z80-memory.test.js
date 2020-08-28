import Z80Memory from './z80-memory';

test('empty memory', () => {
  const mem = new Z80Memory(0x4000);
  expect(mem.size).toBe(0x4000);
});

test('read unintialized', () => {
  const mem = new Z80Memory(0x4000);
  const byte = mem.readOne(0x2000);
  expect(byte).toBe(0);
});

test('single write/read', () => {
  const mem = new Z80Memory(0x4000);
  mem.writeOne(0x2001, 1);
  const b0 = mem.readOne(0x2000);
  const b1 = mem.readOne(0x2001);
  expect(b0).toBe(0);
  expect(b1).toBe(1);
});

test('multi write/read', () => {
  const mem = new Z80Memory(0x4000);
  const writeData = [1, 2, 3, 4];
  mem.writeMany(0x2000, writeData);
  const bytes = mem.readMany(0x2000, 4);
  bytes.forEach((el, i) => {
    expect(el).toBe(writeData[i]);
  });
});
