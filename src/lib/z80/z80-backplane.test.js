import memory from './z80-memory';
import cpu, { Z80FlagMasks as masks } from './z80-cpu';
import backplane from './z80-backplane';
import inst from './z80-inst';
import { clamp8, parity8 } from '../bin-ops';

const build_cpu = () => {
  const mainboard = new backplane();
  const proc = new cpu();
  const mem = new memory(0x10000);

  mainboard.registerDevice(proc);
  mainboard.mapAddress(0, mem);

  return [mainboard, proc, mem];
}

test('clamp', () => {
  const [b, v] = clamp8(0x1ff);
  expect(b).toBe(0x0ff);
  expect(v).toBe(1);
});

test('even parity', () => {
  const p = parity8(3);
  expect(p).toBe(1);
});

test('odd parity', () => {
  const p = parity8(2);
  expect(p).toBe(0);
});

test('simple backplane test', () => {
  const [mainboard, proc, mem ] = build_cpu();

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
  expect(proc.readFlags().z).toBe(1);
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
  expect(proc.readFlags().z).toBe(1);
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
  expect(proc.readFlags().c).toBe(1);
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
  expect(proc.readFlags().c).toBe(0);
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
  expect(proc.readFlags().c).toBe(1);
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
  expect(proc.readFlags().c).toBe(1);
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
  expect(proc.readFlags().c).toBe(1);
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

