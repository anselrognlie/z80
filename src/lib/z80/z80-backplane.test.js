import memory, { Z80MemoryError } from './z80-memory';
import cpu, { Z80FlagMasks as masks } from './z80-cpu';
import backplane from './z80-backplane';
import {
  Z80Instructions as inst,
  Z80Extended as ext,
  Z80Bit as bit,
  Z80Index as index,
  Z80IndexBit as index_bit,
 } from './z80-inst';
import '../test-helper'

class IoTestProvider {
  constructor() {
    this.data = 0;
    this.addr = 0;
  }

  // consumer api

  get size() {
    return 1;
  }

  writeByte(port, _high, value) {
    this.addr = port;
    this.data = value;
  }

  readByte(port, _high) {
    this.addr = port;
    return this.data;
  }
}

class IoBytesTestProvider {
  constructor() {
    this.data = [];
    this.addr = 0;
    this.offset = 0;
  }

  load(data) {
    this.data = [...data];
    this.offset = 0;
  }

  // consumer api

  get size() {
    return 1;
  }

  writeByte(port, _high, value) {
    this.addr = port;
    this.data.push(value);
  }

  readByte(port, _high) {
    this.addr = port;
    return this.data[this.offset++];
  }
}

class NmiSource {
  constructor() {
    this.count = 0;
  }

  completeNmi() {
    ++this.count;
  }
}

class InterruptSource {
  constructor() {
    this.count = 0;
  }

  completeInterrupt() {
    ++this.count;
  }
}

const build_cpu = () => {
  const mainboard = new backplane();
  const proc = new cpu();
  const mem = new memory(0x10000);

  mainboard.registerDevice(proc);
  mainboard.mapAddress(0, mem);
  proc.useTStates(false);

  return [mainboard, proc, mem];
}

test('undefined opcode', () => {
  const [ , , mem ] = build_cpu();


  expect(() => {
    mem.load(0, [
      inst.INVALID,
      inst.halt,
    ]);
  }).toThrow(Z80MemoryError);
});

test('simple backplane test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  proc.useTStates(true);

  mem.load(0, [
    inst.nop,
    inst.halt,
  ]);

  let t = 0;
  while (! proc.halted) {
    ++t;
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(2);
  expect(t).toBe(5);
});

test('ld bc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.bc).toBe(0x3210);
});

test('inc b test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const inc_b = inst.inc_b;

  mem.load(0, [
    inc_b,
    inc_b,
    inc_b,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.b).toBe(3);
});

test('dec b test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const inc_b = inst.inc_b;
  const dec_b = inst.dec_b;

  mem.load(0, [
    inc_b,
    inc_b,
    dec_b,
    dec_b,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.b).toBe(0);
  expect(proc.getFlags().z).toBe(1);
});

test('ld b imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_b_imm, 0x01,
    inst.dec_b,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.b).toBe(0);
  expect(proc.getFlags().z).toBe(1);
});

test('rlca test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x080,
    inst.rlca,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(1);
  expect(proc.getFlags().c).toBe(1);
});

test('ex af test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x080,
    inst.rlca,
    inst.ex_af,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a$).toBe(1);
  expect(proc.getFlags().c).toBe(0);
  expect(proc.registers.f$ & masks.C).not.toBe(0);
});

test('add hl bc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.ld_hl_imm, 0x54, 0x76,
    inst.add_hl_bc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.bc).toBe(0x3210);
  expect(proc.hl).toBe(0xa864);
});

test('a ptr bc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.ld_a_imm, 0x0a0,
    inst.ld_ptr_bc_a,
    inst.ld_a_imm, 0,
    inst.ld_a_ptr_bc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.registers.a).toBe(0x0a0);
});

test('inc bc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.inc_bc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(2);
  expect(proc.bc).toBe(1);
});

test('dec bc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x02, 0x00,
    inst.dec_bc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.bc).toBe(1);
});

test('rrca test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x003,
    inst.rrca,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(129);
  expect(proc.getFlags().c).toBe(1);
});

test('djnz test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_b_imm, 0x0a,
    inst.ld_c_imm, 0,
    inst.inc_c,
    inst.djnz_imm, 0xfd,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.registers.b).toBe(0);
  expect(proc.registers.c).toBe(10);
});

test('asst d test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_d_imm, 0x0a,
    inst.dec_d,
    inst.inc_d,
    inst.inc_de,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.d).toBe(10);
  expect(proc.registers.e).toBe(1);
});

test('asst de test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_de_imm, 0xff, 0x01,
    inst.inc_de,
    inst.ld_a_imm, 0x0a,
    inst.ld_ptr_de_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.de).toBe(0x0200);
  expect(mem.readOne(0x0200)).toBe(10);
});

test('rla test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x080,
    inst.rla,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0);
  expect(proc.getFlags().c).toBe(1);
});

test('jr test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.jr_imm, 0x02,
    inst.jr_imm, 0x04,
    inst.jr_imm, 0xfc,
    inst.ld_a_imm, 0x0a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0);
});

test('rra test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x003,
    inst.rra,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(1);
  expect(proc.getFlags().c).toBe(1);
});

test('jr nz test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_b_imm, 0x0a,
    inst.inc_c,
    inst.dec_b,
    inst.jr_nz_imm, 0x0fc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.b).toBe(0);
  expect(proc.registers.c).toBe(10);
});

test('ld ptr imm hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_imm_hl, 0x00, 0x10,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.hl).toBe(0x3210);
  expect(mem.readOne(0x1000)).toBe(0x10);
  expect(mem.readOne(0x1001)).toBe(0x32);
});

test('asst e test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_e_imm, 0x0a,
    inst.dec_e,
    inst.inc_e,
    inst.inc_de,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.d).toBe(0);
  expect(proc.registers.e).toBe(11);
});

test('asst h test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_h_imm, 0x0a,
    inst.dec_h,
    inst.inc_h,
    inst.inc_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.h).toBe(10);
  expect(proc.registers.l).toBe(1);
});

test('daa test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x015,
    inst.ld_h_imm, 0x027,
    inst.add_a_h,
    inst.daa,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.h).toBe(0x027);
  expect(proc.registers.a).toBe(0x042);
});

test('add_a_h test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.ld_h_imm, 0x0a,
    inst.add_a_h,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.h).toBe(10);
  expect(proc.registers.a).toBe(0x014);
});

test('jr z test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_b_imm, 0x01,
    inst.inc_c,
    inst.dec_b,
    inst.jr_z_imm, 0x0fc,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.b).toBe(0x0ff);
  expect(proc.registers.c).toBe(2);
});

test('ld hl ptr imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x23, 0x01,
    inst.ld_ptr_imm_hl, 0x45, 0x67,
    inst.ld_hl_imm, 0x00, 0x00,
    inst.ld_hl_ptr_imm, 0x45, 0x67,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(13);
  expect(proc.hl).toBe(0x0123);
  expect(mem.readWord(0x6745)).toBe(0x0123);
});

test('asst l test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_l_imm, 0x0a,
    inst.dec_l,
    inst.inc_l,
    inst.inc_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.h).toBe(0);
  expect(proc.registers.l).toBe(11);
});

test('asst hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0xff, 0x01,
    inst.inc_hl,
    inst.ld_a_imm, 0x0a,
    inst.ld_ptr_hl_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.hl).toBe(0x0200);
  expect(mem.readOne(0x0200)).toBe(10);
});

test('cpl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.cpl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0x055);
});

test('ld ptr imm a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.ld_ptr_imm_a, 0x10, 0x32,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(mem.readOne(0x3210)).toBe(0x0aa);
});

test('simple sp test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_sp_imm, 0x00, 0x10,
    inst.inc_sp,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.sp).toBe(0x1001);
});

test('ld ptr hl imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xa0,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(mem.readOne(0x1000)).toBe(0x0a0);
});

test('scf test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.scf,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(2);
  const f = proc.getFlags();
  expect(f).toMatchStruct({ c:1, h:0, n:0 });
});

test('jr c nc test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0ff,
    inst.ld_h_imm, 0x01,
    inst.add_a_h,
    inst.jr_c_imm, 0x01,
    inst.inc_b,
    inst.add_a_h,
    inst.jr_nc_imm, 0x02,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(14);
  expect(proc.registers.a).toBe(1);
  expect(proc.registers.b).toBe(0);
});

test('ld hl sp test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_sp_imm, 0x01, 0x23,
    inst.ld_hl_imm, 0x23, 0x45,
    inst.add_hl_sp,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.hl).toBe(0x6824);
});

test('ld a ptr imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x0a,
    inst.ld_a_ptr_imm, 0x10, 0x32,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0a);
});

test('ccf 1 test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ccf,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(2);
  expect(proc.getFlags()).toMatchStruct({ c:1 });
});

test('ccf 0 test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ccf,
    inst.ccf,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(3);
  expect(proc.getFlags()).toMatchStruct({ c:0 });
});

test('ld r8 r8 variants test', () => {
  const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let dst of r8List) {
    for (let src of r8List) {
      const initKey = `ld_${src}_imm`;
      const ldKey = `ld_${dst}_${src}`;

      const [mainboard, proc, mem ] = build_cpu();

      mem.load(0, [
        inst[initKey], 0x0a,
        inst[ldKey],
        inst.halt,
      ]);

      while (! proc.halted) {
        mainboard.clock();
      }

      expect(proc.registers.pc).toBe(4);
      expect(proc.registers[dst]).toBe(0x0a);
    }
  }
});

test('ld ptr hl r8 variants test', () => {
  const r8List = [ 'a', 'b', 'c', 'd', 'e' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const ldKey = `ld_ptr_hl_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst[initKey], 0x0a,
      inst.ld_hl_imm, 0x10, 0x32,
      inst[ldKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(7);
    expect(mem.readOne(0x3210)).toBe(0x0a);
  }
});

test('ld ptr hl h test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_h,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(mem.readOne(0x3210)).toBe(0x32);
});

test('ld ptr hl l test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_l,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(mem.readOne(0x3210)).toBe(0x10);
});

test('ld r8 ptr hl variants test', () => {
  const r8List = [ 'a', 'b', 'c', 'd', 'e' ];
  for (let dst of r8List) {
    const ldKey = `ld_${dst}_ptr_hl`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst.ld_bc_imm, 0x10, 0x32,
      inst.ld_a_imm, 0x0a,
      inst.ld_ptr_bc_a,
      inst.ld_hl_imm, 0x10, 0x32,
      inst[ldKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(11);
    expect(proc.registers[dst]).toBe(0x0a);
  }
});

test('ld h ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.ld_a_imm, 0x0a,
    inst.ld_ptr_bc_a,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_h_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.registers.h).toBe(0x0a);
});

test('ld l ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.ld_a_imm, 0x0a,
    inst.ld_ptr_bc_a,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_l_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.registers.l).toBe(0x0a);
});

test('add a r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const addKey = `add_a_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst[initKey], 0x0a,
      inst[addKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(4);
    expect(proc.registers.a).toBe(0x0a);
  }
});

test('add a a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.add_a_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(20);
});

test('add a ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x0a,
    inst.add_a_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.a).toBe(10);
});

test('adc a r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const adcKey = `adc_a_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst[initKey], 0x0ff,
      inst[adcKey],
      inst[adcKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers.a).toBe(0x0fe);
  }
});

test('adc a a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0xff,
    inst.adc_a_a,
    inst.adc_a_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0x0fd);
});

test('adc a ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0xff,
    inst.ld_a_imm, 0xff,
    inst.adc_a_ptr_hl,
    inst.adc_a_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.registers.a).toBe(0x0fe);
});

test('sub r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const subKey = `sub_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst[initKey], 0x0a,
      inst[subKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(4);
    expect(proc.registers.a).toBe(0xf6);
  }
});

test('sub a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.sub_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0);
});

test('sub ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x0a,
    inst.sub_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.a).toBe(0xf6);
});

test('sbc a r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const sbcKey = `sbc_a_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst[initKey], 0x01,
      inst[sbcKey],
      inst[sbcKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers.a).toBe(0x0fd);
  }
});

test('sbc a a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0xff,
    inst.add_a_a,
    inst.sbc_a_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0x0ff);
});

test('sbc a ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x1,
    inst.ld_a_imm, 0x00,
    inst.sbc_a_ptr_hl,
    inst.sbc_a_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.registers.a).toBe(0x0fd);
});

test('and r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const andKey = `and_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst.ld_a_imm, 0x0aa,
      inst[initKey], 0x0a,
      inst[andKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(6);
    expect(proc.registers.a).toBe(0x0a);
  }
});

test('and a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.and_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0x0a);
});

test('and ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x0a,
    inst.and_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0a);
});

test('or r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const orKey = `or_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst.ld_a_imm, 0x0aa,
      inst[initKey], 0x05,
      inst[orKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(6);
    expect(proc.registers.a).toBe(0x0af);
  }
});

test('or a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.or_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0x0a);
});

test('or ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x05,
    inst.or_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0af);
});

test('xor r8 variants test', () => {
  const r8List = [ 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const xorKey = `xor_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst.ld_a_imm, 0x0ff,
      inst[initKey], 0x0aa,
      inst[xorKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(6);
    expect(proc.registers.a).toBe(0x055);
  }
});

test('xor a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.xor_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0);
});

test('xor ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0ff,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x0aa,
    inst.xor_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x055);
});

test('cp r8 variants test', () => {
  const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
  for (let src of r8List) {
    const initKey = `ld_${src}_imm`;
    const cpKey = `cp_${src}`;

    const [mainboard, proc, mem ] = build_cpu();

    mem.load(0, [
      inst.ld_a_imm, 0x0aa,
      inst[initKey], 0x0aa,
      inst[cpKey],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(6);
    expect(proc.registers.a).toBe(0x0aa);
    expect(proc.getFlags().z).toBe(1);
  }
});

test('cp ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.cp_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0aa);
  expect(proc.getFlags().z).toBe(1);
});

test('call ret test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.call_imm, 0x04, 0x00,
    inst.halt,
    inst.inc_a,
    inst.ret,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(4);
  expect(proc.registers.a).toBe(0x01);
});

test('ret z test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.call_imm, 0x06, 0x00,
    inst.halt,
    inst.inc_b,
    inst.dec_a,
    inst.ret_z,
    inst.jr_imm, 0xfb,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.registers.a).toBe(0);
  expect(proc.registers.b).toBe(10);
});

test('call z test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x02,
    inst.call_z_imm, 0x0e, 0x00,
    inst.dec_a,
    inst.call_z_imm, 0x0e, 0x00,
    inst.dec_a,
    inst.call_z_imm, 0x10, 0x00,
    inst.halt,
    inst.inc_b,
    inst.ret,
    inst.inc_c,
    inst.ret,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(14);
  expect(proc.registers.a).toBe(0);
  expect(proc.registers.b).toBe(0);
  expect(proc.registers.c).toBe(1);
});

test('jp imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.jp_imm, 0x05, 0x00,
    inst.ld_b_imm, 0x0a,
    inst.ld_a_imm, 0x0a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.registers.a).toBe(10);
  expect(proc.registers.b).toBe(0);
});

test('jp z nz imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.inc_b,
    inst.dec_a,
    inst.jp_z_imm, 0x0a, 0x00,
    inst.jp_imm, 0x02, 0x00,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.registers.a).toBe(0);
  expect(proc.registers.b).toBe(10);
});

test('push pop test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x10, 0x32,
    inst.push_bc,
    inst.pop_de,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(6);
  expect(proc.de).toBe(0x3210);
});

test('rst 08 test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.rst_08,
    inst.nop,
    inst.nop,
    inst.nop,
    inst.nop,
    inst.nop,
    inst.nop,
    inst.nop,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.sp).toBe(0x0fffe);
});

test('add adc imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0xff,
    inst.add_a_imm, 1,
    inst.adc_a_imm, 0,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.a).toBe(1);
});

test('sub sbc imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.sub_imm, 1,
    inst.sbc_a_imm, 0,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0xfe);
});

test('and imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.and_imm, 0x0a,
    inst.halt,
]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0x0a);
});

test('or imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.or_imm, 0x0a,
    inst.halt,
]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0xaa);
});

test('xor imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0aa,
    inst.xor_imm, 0x0a,
    inst.halt,
]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0xa0);
});

test('cp imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.cp_imm, 0x0a,
    inst.jr_z_imm, 0x01,
    inst.inc_a,
    inst.halt,
]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.registers.a).toBe(0x0a);
});

test('ex de hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_de_imm, 0x010, 0x032,
    inst.ld_hl_imm, 0x023, 0x001,
    inst.ex_de_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.de).toBe(0x0123);
  expect(proc.hl).toBe(0x3210);
});

test('exx test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_bc_imm, 0x0cc, 0x0bb,
    inst.ld_de_imm, 0x010, 0x032,
    inst.ld_hl_imm, 0x023, 0x001,
    inst.exx,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.bc$).toBe(0x0bbcc);
  expect(proc.de$).toBe(0x3210);
  expect(proc.hl$).toBe(0x0123);
  expect(proc.bc).toBe(0);
  expect(proc.de).toBe(0);
  expect(proc.hl).toBe(0);
});

test('ex ptr sp hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x023, 0x001,
    inst.push_hl,
    inst.ld_hl_imm, 0x067, 0x045,
    inst.ex_ptr_sp_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.hl).toBe(0x0123);
  expect(mem.readWord(0x0fffe)).toBe(0x4567);
});

test('di test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.di,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(2);
  expect(proc.registers.iff1).toBe(0);
  expect(proc.registers.iff2).toBe(0);
});

test('ei test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.di,
    inst.ei,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(3);
  expect(proc.registers.iff1).toBe(1);
  expect(proc.registers.iff2).toBe(1);
});

test('ld sp hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x23, 0x01,
    inst.ld_sp_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.sp).toBe(0x0123);
});

test('jmp ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x06, 0x00,
    inst.jp_ptr_hl,
    inst.ld_a_imm, 0x0a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(7);
  expect(proc.registers.a).toBe(0);
});

test('out ptr imm a test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const io10 = new IoTestProvider();
  const io11 = new IoTestProvider();
  mainboard.mapPort(0x10, io10);
  mainboard.mapPort(0x11, io11);

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.out_ptr_imm_a, 0x10,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(10);
  expect(io10.addr).toBe(0);
  expect(io10.data).toBe(0x0a);
  expect(io11.addr).toBe(0);
  expect(io11.data).toBe(0);
});

test('in a ptr imm test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const io10 = new IoTestProvider();
  const io11 = new IoTestProvider();
  io11.data = 0x0b;
  mainboard.mapPort(0x10, io10);
  mainboard.mapPort(0x11, io11);

  mem.load(0, [
    inst.ld_a_imm, 0x0a,
    inst.in_a_ptr_imm, 0x11,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(11);
});

test('in r8 ptr c test', () => {
  // note: f is an undocumented opcode
  const regs = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l'];

  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const io10 = new IoTestProvider();
    const io11 = new IoTestProvider();
    io11.data = 0x0b;
    mainboard.mapPort(0x10, io10);
    mainboard.mapPort(0x11, io11);

    const inInst = `in_${r}_ptr_c`;

    mem.load(0, [
      inst.ld_c_imm, 0x11,
      inst.pre_80, ext[inInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(11);
  });
});

test('out ptr c r8 test', () => {
  const regs = ['a', 'b', 'd', 'e', 'h', 'l'];

  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const io10 = new IoTestProvider();
    const io11 = new IoTestProvider();
    mainboard.mapPort(0x10, io10);
    mainboard.mapPort(0x11, io11);

    const ldInst = `ld_${r}_imm`;
    const outInst = `out_ptr_c_${r}`;

    mem.load(0, [
      inst[ldInst], 0x0a,
      inst.ld_c_imm, 0x10,
      inst.pre_80, ext[outInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(7);
    expect(proc.registers[r]).toBe(10);
    expect(io10.addr).toBe(0);
    expect(io10.data).toBe(0x0a);
    expect(io11.addr).toBe(0);
    expect(io11.data).toBe(0);
  });
});

test('out ptr c c test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const io10 = new IoTestProvider();
  const io11 = new IoTestProvider();
  mainboard.mapPort(0x10, io10);
  mainboard.mapPort(0x11, io11);

  mem.load(0, [
    inst.ld_c_imm, 0x10,
    inst.pre_80, ext.out_ptr_c_c,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.c).toBe(16);
  expect(io10.addr).toBe(0);
  expect(io10.data).toBe(16);
  expect(io11.addr).toBe(0);
  expect(io11.data).toBe(0);
});

test('out ptr c f test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const io10 = new IoTestProvider();
  const io11 = new IoTestProvider();
  mainboard.mapPort(0x10, io10);
  mainboard.mapPort(0x11, io11);

  proc.registers.f = 0x0a;

  mem.load(0, [
    inst.ld_c_imm, 0x10,
    inst.pre_80, ext.out_ptr_c_f,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.f).toBe(10);
  expect(io10.addr).toBe(0);
  expect(io10.data).toBe(10);
  expect(io11.addr).toBe(0);
  expect(io11.data).toBe(0);
});

test('ld ptr imm r16 test', () => {
  const regs = ['bc', 'de', 'hl', 'sp'];
  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const initInst = `ld_${r}_imm`;
    const ldInst = `ld_ptr_imm_${r}`;

    mem.load(0, [
      inst[initInst], 0x10, 0x32,
      inst.pre_80, ext[ldInst], 0x00, 0x10,
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(8);
    expect(mem.readWord(0x1000)).toBe(0x3210);
  });
});

test('ld r16 ptr imm test', () => {
  const regs = ['bc', 'de', 'hl', 'sp'];
  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_ptr_imm`;

    mem.load(0, [
      inst.ld_hl_imm, 0x10, 0x32,
      inst.ld_ptr_imm_hl, 0x00, 0x10,
      inst.ld_hl_imm, 0, 0,
      inst.pre_80, ext[ldInst], 0x00, 0x10,
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(14);
    expect(proc[r]).toBe(0x3210);
  });
});

test('sbc hl r16 test', () => {
  const regs = ['bc', 'de', 'hl', 'sp'];
  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const sbcInst = `sbc_hl_${r}`;

    mem.load(0, [
      inst.scf,
      inst.ld_hl_imm, 0x10, 0x32,
      inst[ldInst], 0x10, 0x32,
      inst.pre_80, ext[sbcInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(10);
    expect(proc.hl).toBe(0xffff);
  });
});

test('adc hl r16 test', () => {
  const regs = ['bc', 'de', 'hl', 'sp'];
  regs.forEach(r => {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const adcInst = `adc_hl_${r}`;

    mem.load(0, [
      inst.scf,
      inst.ld_hl_imm, 0x10, 0x32,
      inst[ldInst], 0x10, 0x32,
      inst.pre_80, ext[adcInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(10);
    expect(proc.hl).toBe(0x6421);
  });
});

test('neg test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x01,
    inst.pre_80, ext.neg,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.a).toBe(0xff);
});

test('ld i a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0cc,
    inst.pre_80, ext.ld_i_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.i).toBe(0xcc);
});

test('ld r a test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0cc,
    inst.pre_80, ext.ld_r_a,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(5);
  expect(proc.registers.r).toBe(0xcc);
});

test('ld a i test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0cc,
    inst.pre_80, ext.ld_i_a,
    inst.ld_a_imm, 0,
    inst.pre_80, ext.ld_a_i,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0xcc);
});

test('ld a r test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_a_imm, 0x0cc,
    inst.pre_80, ext.ld_r_a,
    inst.ld_a_imm, 0,
    inst.pre_80, ext.ld_a_r,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0xcc);
});

test('rld test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x021,
    inst.ld_a_imm, 0x43,
    inst.pre_80, ext.rld,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.registers.a).toBe(0x42);
  expect(mem.readOne(0x3210)).toBe(0x13);
});

test('rrd test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x10, 0x32,
    inst.ld_ptr_hl_imm, 0x021,
    inst.ld_a_imm, 0x43,
    inst.pre_80, ext.rrd,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.registers.a).toBe(0x41);
  expect(mem.readOne(0x3210)).toBe(0x32);
});

test('ldi test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_de_imm, 0x00, 0x20,
    inst.ld_ptr_hl_imm, 0x0aa,
    inst.pre_80, ext.ldi,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.hl).toBe(0x1001);
  expect(proc.de).toBe(0x2001);
  expect(proc.bc).toBe(0xffff);
  expect(mem.readOne(0x2000)).toBe(0x0aa);
});

test('ldd test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_de_imm, 0x00, 0x20,
    inst.ld_ptr_hl_imm, 0x0aa,
    inst.pre_80, ext.ldd,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.hl).toBe(0x0fff);
  expect(proc.de).toBe(0x1fff);
  expect(proc.bc).toBe(0xffff);
  expect(mem.readOne(0x2000)).toBe(0x0aa);
});

test('ldir test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0x1000, [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_de_imm, 0x00, 0x20,
    inst.ld_bc_imm, 0x0a, 0x00,
    inst.pre_80, ext.ldir,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(12);
  expect(proc.hl).toBe(0x100a);
  expect(proc.de).toBe(0x200a);
  expect(proc.bc).toBe(0x0000);
  expect(mem.readMany(0x2000, 10)).toEqual([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);
});

test('lddr test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0x1000, [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x09, 0x10,
    inst.ld_de_imm, 0x09, 0x20,
    inst.ld_bc_imm, 0x0a, 0x00,
    inst.pre_80, ext.lddr,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(12);
  expect(proc.hl).toBe(0x0fff);
  expect(proc.de).toBe(0x1fff);
  expect(proc.bc).toBe(0x0000);
  expect(mem.readMany(0x2000, 10)).toEqual([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);
});

test('cpi test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.ld_a_imm, 0xaa,
    inst.pre_80, ext.cpi,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.hl).toBe(0x1001);
  expect(proc.bc).toBe(0xffff);
  expect(proc.getFlags().z).toBe(1);
});

test('cpd test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.ld_a_imm, 0xaa,
    inst.pre_80, ext.cpd,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.hl).toBe(0x0fff);
  expect(proc.bc).toBe(0xffff);
  expect(proc.getFlags().z).toBe(1);
});

test('cpir test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0x1000, [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_bc_imm, 0x0a, 0x00,
    inst.ld_a_imm, 0x04,
    inst.pre_80, ext.cpir,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  const f = proc.getFlags();

  expect(proc.registers.pc).toBe(11);
  expect(proc.hl).toBe(0x1004);
  expect(proc.bc).toBe(0x0006);
  expect(f.z).toBe(1);
  expect(f.p_v).toBe(1);
});

test('cpdr test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0x1000, [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x09, 0x10,
    inst.ld_bc_imm, 0x0a, 0x00,
    inst.ld_a_imm, 0x04,
    inst.pre_80, ext.cpdr,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  const f = proc.getFlags();

  expect(proc.registers.pc).toBe(11);
  expect(proc.hl).toBe(0x1002);
  expect(proc.bc).toBe(0x0003);
  expect(f.z).toBe(1);
  expect(f.p_v).toBe(1);
});

test('inir test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  const io = new IoBytesTestProvider();
  mainboard.mapPort(0x10, io);
  io.load([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_b_imm, 0x0a,
    inst.ld_c_imm, 0x10,
    inst.pre_80, ext.inir,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.hl).toBe(0x100a);
  expect(proc.registers.b).toBe(0);
  expect(mem.readMany(0x1000, 10)).toEqual([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);
});

test('otir test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  const io = new IoBytesTestProvider();
  mainboard.mapPort(0x10, io);
  mem.load(0x1000, [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_b_imm, 0x0a,
    inst.ld_c_imm, 0x10,
    inst.pre_80, ext.otir,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(10);
  expect(proc.hl).toBe(0x100a);
  expect(proc.registers.b).toBe(0);
  expect(io.data).toEqual([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  ]);
});

test('im test', () => {
  const modes = [[0, cpu.INT_MODE_0], [1, cpu.INT_MODE_1], [2, cpu.INT_MODE_2]];
  for (let [mode, result] of modes) {
    const [mainboard, proc, mem ] = build_cpu();
    const imInst = `im_${mode}`;

    mem.load(0, [
      inst.pre_80, ext[imInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(3);
    expect(proc.intMode).toBe(result);
  }
});

test('ei off test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.di,
    inst.ei,
    inst.nop,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
    if (proc.registers.pc === 2 ) { break; }
  }

  expect(proc.registers.iff1).toBe(0);
  expect(proc.registers.iff2).toBe(0);
});


test('ei on test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.di,
    inst.ei,
    inst.nop,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
    if (proc.registers.pc === 3 ) { break; }
  }

  expect(proc.registers.iff1).toBe(1);
  expect(proc.registers.iff2).toBe(1);
});

test('rlc r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const rlcInst = `rlc_${r}`;

    mem.load(0, [
      inst[ldInst], 0xaa,
      inst.pre_bit, bit[rlcInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0x55);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('rlc ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.pre_bit, bit.rlc_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0x55);
  expect(proc.getFlags().c).toBe(1);
});

test('rrc r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const rrcInst = `rrc_${r}`;

    mem.load(0, [
      inst[ldInst], 0x55,
      inst.pre_bit, bit[rrcInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0xaa);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('rrc ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0x55,
    inst.pre_bit, bit.rrc_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0xaa);
  expect(proc.getFlags().c).toBe(1);
});

test('rl r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const rlInst = `rl_${r}`;

    mem.load(0, [
      inst[ldInst], 0xaa,
      inst.pre_bit, bit[rlInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0x54);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('rl ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.pre_bit, bit.rl_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0x54);
  expect(proc.getFlags().c).toBe(1);
});

test('rr r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const rrInst = `rr_${r}`;

    mem.load(0, [
      inst[ldInst], 0x55,
      inst.pre_bit, bit[rrInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0x2a);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('rr ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0x55,
    inst.pre_bit, bit.rr_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0x2a);
  expect(proc.getFlags().c).toBe(1);
});

test('sla r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const slaInst = `sla_${r}`;

    mem.load(0, [
      inst[ldInst], 0xaa,
      inst.pre_bit, bit[slaInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0x54);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('sla ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xaa,
    inst.pre_bit, bit.sla_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0x54);
  expect(proc.getFlags().c).toBe(1);
});

test('sra r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const sraInst = `sra_${r}`;

    mem.load(0, [
      inst[ldInst], 0xa5,
      inst.pre_bit, bit[sraInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0xd2);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('sra ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xa5,
    inst.pre_bit, bit.sra_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0xd2);
  expect(proc.getFlags().c).toBe(1);
});

test('srl r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    const [mainboard, proc, mem ] = build_cpu();
    const ldInst = `ld_${r}_imm`;
    const srlInst = `srl_${r}`;

    mem.load(0, [
      inst[ldInst], 0xa5,
      inst.pre_bit, bit[srlInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(5);
    expect(proc.registers[r]).toBe(0x52);
    expect(proc.getFlags().c).toBe(1);
  }
});

test('srl ptr hl test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.ld_hl_imm, 0x00, 0x10,
    inst.ld_ptr_hl_imm, 0xa5,
    inst.pre_bit, bit.srl_ptr_hl,
    inst.halt,
  ]);

  while (! proc.halted) {
    mainboard.clock();
  }

  expect(proc.registers.pc).toBe(8);
  expect(mem.readOne(0x1000)).toBe(0x52);
  expect(proc.getFlags().c).toBe(1);
});

test('bit r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    for (let b = 0; b < 8; ++b) {
      const [mainboard, proc, mem ] = build_cpu();
      const ldInst = `ld_${r}_imm`;
      const bitInst = `bit_${b}_${r}`;

      const value = 1 << b;

      mem.load(0, [
        inst[ldInst], value,  // load with known mask
        inst.pre_bit, bit[bitInst],
        inst.jr_nz_imm, 4,  // skip next ld if bit is set
        inst[ldInst], 3,
        inst.jr_imm, 12,  // skip to end with a failure code 3
        inst[ldInst], 0,  // load with 0
        inst.pre_bit, bit[bitInst],
        inst.jr_z_imm, 4,  // skip next ld if bit not set
        inst[ldInst], 7,
        inst.jr_imm, 2,  // skip to end with a failure code 7
        inst[ldInst], 15,  // success code 15
        inst.halt,
      ]);

      while (! proc.halted) {
        mainboard.clock();
      }

      expect(proc.registers.pc).toBe(23);
      expect(proc.registers[r]).toBe(15);
    }
  }
});

test('bit ptr hl test', () => {
  for (let b = 0; b < 8; ++b) {
    const [mainboard, proc, mem ] = build_cpu();
    const bitInst = `bit_${b}_ptr_hl`;

    const value = 1 << b;

    mem.load(0, [
      inst.ld_hl_imm, 0x00, 0x10,
      inst.ld_ptr_hl_imm, value,  // load with known mask
      inst.pre_bit, bit[bitInst],
      inst.jr_nz_imm, 4,  // skip next ld if bit is set
      inst.ld_a_imm, 3,
      inst.jr_imm, 12,  // skip to end with a failure code 3
      inst.ld_ptr_hl_imm, 0,  // load with 0
      inst.pre_bit, bit[bitInst],
      inst.jr_z_imm, 4,  // skip next ld if bit not set
      inst.ld_a_imm, 7,
      inst.jr_imm, 2,  // skip to end with a failure code 7
      inst.ld_a_imm, 15,  // success code 15
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(26);
    expect(proc.registers.a).toBe(15);
  }
});

test('res r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    for (let b = 0; b < 8; ++b) {
      const [mainboard, proc, mem ] = build_cpu();
      const ldInst = `ld_${r}_imm`;
      const resInst = `res_${b}_${r}`;

      const value = 1 << b;
      const result = ~value & 0xff;

      mem.load(0, [
        inst[ldInst], 0xff,
        inst.pre_bit, bit[resInst],
        inst.halt,
      ]);

      while (! proc.halted) {
        mainboard.clock();
      }

      expect(proc.registers.pc).toBe(5);
      expect(proc.registers[r]).toBe(result);
    }
  }
});

test('res ptr hl test', () => {
  for (let b = 0; b < 8; ++b) {
    const [mainboard, proc, mem ] = build_cpu();
    const resInst = `res_${b}_ptr_hl`;

    const value = 1 << b;
    const result = ~value & 0xff;

    mem.load(0, [
      inst.ld_hl_imm, 0x00, 0x10,
      inst.ld_ptr_hl_imm, 0xff,
      inst.pre_bit, bit[resInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(8);
    expect(mem.readOne(0x1000)).toBe(result);
  }
});

test('set r8 test', () => {
  const regs = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];
  for (let r of regs) {
    for (let b = 0; b < 8; ++b) {
      const [mainboard, proc, mem ] = build_cpu();
      const ldInst = `ld_${r}_imm`;
      const setInst = `set_${b}_${r}`;

      const result = 1 << b;

      mem.load(0, [
        inst[ldInst], 0x00,
        inst.pre_bit, bit[setInst],
        inst.halt,
      ]);

      while (! proc.halted) {
        mainboard.clock();
      }

      expect(proc.registers.pc).toBe(5);
      expect(proc.registers[r]).toBe(result);
    }
  }
});

test('set ptr hl test', () => {
  for (let b = 0; b < 8; ++b) {
    const [mainboard, proc, mem ] = build_cpu();
    const setInst = `set_${b}_ptr_hl`;

    const result = 1 << b;

    mem.load(0, [
      inst.ld_hl_imm, 0x00, 0x10,
      inst.ld_ptr_hl_imm, 0x00,
      inst.pre_bit, bit[setInst],
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(8);
    expect(mem.readOne(0x1000)).toBe(result);
  }
});

test('nmi test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const source = new NmiSource();

  mem.load(0x66, [
    inst.inc_a,
    inst.pre_80, ext.retn,
  ]);

  mem.load(0, [
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseNmi(source);
    }
  }

  expect(proc.registers.pc).toBe(8);
  expect(proc.registers.a).toBe(0x0a);
  expect(source.count).toBe(10);
})

test('raise im1 test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const source = new InterruptSource();

  mem.load(0x38, [
    inst.di,
    inst.inc_a,
    inst.ei,
    inst.pre_80, ext.reti,
  ]);

  mem.load(0, [
    inst.pre_80, ext.im_1,
    inst.ei,
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseInterrupt(source);
    }
  }

  expect(proc.registers.pc).toBe(11);
  expect(proc.registers.a).toBe(0x0a);
  expect(source.count).toBe(10);
})

test('raise im2 test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const source = new InterruptSource();

  mem.load(0x1000, [ 0x00, 0x0f ]);

  mem.load(0x0f00, [
    inst.di,
    inst.inc_a,
    inst.ei,
    inst.pre_80, ext.reti,
  ]);

  mem.load(0, [
    inst.pre_80, ext.im_2,
    inst.ld_a_imm, 0x10,
    inst.pre_80, ext.ld_i_a,
    inst.xor_a,
    inst.ei,
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseInterrupt(source, 0x00);
    }
  }

  expect(proc.registers.pc).toBe(16);
  expect(proc.registers.a).toBe(0x0a);
  expect(source.count).toBe(10);
})

test('raise im0 single byte test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const source = new InterruptSource();

  mem.load(0x30, [
    inst.di,
    inst.inc_a,
    inst.ei,
    inst.pre_80, ext.reti,
  ]);

  mem.load(0, [
    inst.ei,
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseInterrupt(source, inst.rst_30);
    }
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0a);
  expect(source.count).toBe(10);
})

test('raise im0 multi-byte call test', () => {
  const [mainboard, proc, mem ] = build_cpu();
  const source = new InterruptSource();

  mem.load(0x0f00, [
    inst.di,
    inst.inc_a,
    inst.ei,
    // inst.jp_imm, 0x03, 0x00,
    inst.pre_80, ext.reti,
  ]);

  mem.load(0, [
    inst.ei,
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseInterrupt(source, [ inst.call_imm, 0x00, 0x0f ]);
    }
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0a);
  expect(source.count).toBe(10);
})

test('raise im0 multi-byte jp test', () => {
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0x0f00, [
    inst.di,
    inst.inc_a,
    inst.ei,
    inst.jp_imm, 0x04, 0x00,
  ]);

  mem.load(0, [
    inst.ei,
    inst.ld_c_imm, 0x0a,
    inst.halt,
    inst.cp_c,
    inst.jr_nz_imm, 0xfc,
    inst.ld_b_imm, 0x0b,
    inst.halt,
  ]);

  while (proc.registers.b !== 0x0b) {
    mainboard.clock();
    if (proc.halted) {
      mainboard.raiseInterrupt(null, [ inst.jp_imm, 0x00, 0x0f ]);
    }
  }

  expect(proc.registers.pc).toBe(9);
  expect(proc.registers.a).toBe(0x0a);
})

test('add ind 16 test', () => {
  const inds = ['ix', 'iy'];
  for (let ind of inds) {
    const regs = ['bc', 'de', 'sp'];
    for (let reg of regs) {
      const [mainboard, proc, mem ] = build_cpu();
      const ld16Inst = `ld_${reg}_imm`;
      const ldIndInst = `ld_ind_imm`;
      const addIndInst = `add_ind_${reg}`;
      const preInst = `pre_${ind}`;

      mem.load(0, [
        inst[ld16Inst], 0x10, 0x32,
        inst[preInst], index[ldIndInst], 0x10, 0x32,
        inst[preInst], index[addIndInst],
        inst.halt,
      ]);

      while (! proc.halted) {
        mainboard.clock();
      }

      expect(proc.registers.pc).toBe(10);
      expect(proc[ind]).toBe(0x6420);
    }
  }
});

test('add ind ind test', () => {
  const inds = ['ix', 'iy'];
  for (let ind of inds) {
    const [mainboard, proc, mem ] = build_cpu();
    const preInst = `pre_${ind}`;

    mem.load(0, [
      inst[preInst], index.ld_ind_imm, 0x10, 0x32,
      inst[preInst], index.add_ind_ind,
      inst.halt,
    ]);

    while (! proc.halted) {
      mainboard.clock();
    }

    expect(proc.registers.pc).toBe(7);
    expect(proc[ind]).toBe(0x6420);
  }
});
