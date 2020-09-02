import memory from './z80-memory';
import cpu, { Z80FlagMasks as masks, Z80Error } from './z80-cpu';
import backplane from './z80-backplane';
import inst from './z80-inst';
import '../test-helper'

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
  const [mainboard, proc, mem ] = build_cpu();

  mem.load(0, [
    inst.INVALID,
    inst.halt,
  ]);

  expect(() => {
    while (! proc.halted) {
      mainboard.clock();
    }
  }).toThrow(Z80Error);
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

  expect(proc.registers.pc).toBe(1);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(9);
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

  expect(proc.registers.pc).toBe(1);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(8);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(6);
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

  expect(proc.registers.pc).toBe(6);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(6);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(6);
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

  expect(proc.registers.pc).toBe(12);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(1);
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

  expect(proc.registers.pc).toBe(13);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(8);
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

  expect(proc.registers.pc).toBe(1);
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

  expect(proc.registers.pc).toBe(2);
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

      expect(proc.registers.pc).toBe(3);
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

    expect(proc.registers.pc).toBe(6);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(4);
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

    expect(proc.registers.pc).toBe(10);
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

  expect(proc.registers.pc).toBe(10);
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

  expect(proc.registers.pc).toBe(10);
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

    expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(6);
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

    expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(9);
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

    expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(6);
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

    expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(4);
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

  expect(proc.registers.pc).toBe(9);
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

    expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(8);
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

    expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(8);
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

    expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(8);
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

    expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(8);
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

  expect(proc.registers.pc).toBe(3);
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

  expect(proc.registers.pc).toBe(5);
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

  expect(proc.registers.pc).toBe(13);
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

  expect(proc.registers.pc).toBe(7);
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

  expect(proc.registers.pc).toBe(10);
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

  expect(proc.registers.pc).toBe(5);
  expect(proc.de).toBe(0x3210);
});

