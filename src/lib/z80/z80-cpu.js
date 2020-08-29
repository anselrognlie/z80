import inst from './z80-inst';
import { clamp4, clamp8, clamp16,
  getLo, getHi, splitHiLo,
  toBit, signed8, parity8,
  add8, sub8 } from '../bin-ops';

export class Z80Flags {}

Z80Flags.S = 7;
Z80Flags.Z = 6;
Z80Flags.H = 4;
Z80Flags.P = 2;
Z80Flags.V = 2;
Z80Flags.N = 1;
Z80Flags.C = 0;

export class Z80FlagMasks {}

Z80FlagMasks.S = 1 << Z80Flags.S;
Z80FlagMasks.Z = 1 << Z80Flags.Z;
Z80FlagMasks.H = 1 << Z80Flags.H;
Z80FlagMasks.P = 1 << Z80Flags.P;
Z80FlagMasks.V = 1 << Z80Flags.V;
Z80FlagMasks.N = 1 << Z80Flags.N;
Z80FlagMasks.C = 1 << Z80Flags.C;

class Z80Error extends Error {}

class Z80Cpu {
  constructor() {
    this.bus = null;
    this.registers = {
      a: 0, a$: 0, f: 0, f$: 0, b: 0, b$: 0, c: 0, c$: 0,
      d: 0, d$: 0, e: 0, e$: 0, h: 0, h$: 0, l: 0, l$: 0,
      i: 0, r: 0, sp: 0, pc: 0, iff1: 0, iff2: 0,
      ixh: 0, ixl: 0, iyh: 0, iyl: 0,
    };
    this.intMode = Z80Cpu.INT_MODE_0;
    this.halted = false;
    this.tStates = 0;
    this.tStatesEnabled = true;

    this.registerInstructions();
  }

  registerBus(bus) {
    this.bus = bus;
  }

  get bc() {
    return this.registers.c + (this.registers.b << 8);
  }

  set bc(value) {
    const [clamped, ] = clamp16(value);
    this.registers.c = getLo(clamped);
    this.registers.b = getHi(clamped);
  }

  get de() {
    return this.registers.e + (this.registers.d << 8);
  }

  set de(value) {
    const [clamped, ] = clamp16(value);
    this.registers.e = getLo(clamped);
    this.registers.d = getHi(clamped);
  }

  get hl() {
    return this.registers.l + (this.registers.h << 8);
  }

  set hl(value) {
    const [clamped, ] = clamp16(value);
    this.registers.l = getLo(clamped);
    this.registers.h = getHi(clamped);
  }

  get ix() {
    return this.registers.ixl + (this.registers.ixh << 8);
  }

  get iy() {
    return this.registers.iyl + (this.registers.iyh << 8);
  }

  flagIsSet(mask) {
    return this.registers.f & mask;
  }

  flagNotSet(mask) {
    return ! (this.registers.f & mask);
  }

  setT(t) {
    // the inst that set this already consumed 1 t cycle
    this.tStates = t - 1;
  }

  useTStates(use) {
    this.tStatesEnabled = use;
  }

  reset() {
    const reg = this.registers;
    this.registers = { ...reg, iff1: 0, iff2: 0, pc: 0, i: 0, r: 0 };
    this.intMode = Z80Cpu.INT_MODE_0;
    this.halted = false;
  }

  clock() {
    let undefined;

    if (this.tStatesEnabled) {
      if (this.tStates) {
        this.tStates--;
        return;
      }
    }

    if (this.halted) {
      return;
    }

    const inst = this.readFromPcAdvance();
    if (undefined === inst) {
      const prevPc = (this.registers.pc - 1).toString(16);
      throw new Z80Error(`encountered undefined inst at addr [${prevPc}]`);
    }

    const fn = this.inst[inst];
    if (! fn) {
      const instStr = inst.toString(16);
      throw new Z80Error(`inst [${instStr}] has no registered callback`);
    }

    fn.call(this);

    if (this.tStatesEnabled) {
      if (! this.tStates) {
        const instStr = inst.toString(16);
        throw new Z80Error(`inst [${instStr}] invoked without setting t states`);
      }
    }
  }

  readFromPc() {
    return this.bus.readOne(this.registers.pc);
  }

  readFromPcAdvance() {
    const byte = this.readFromPc();
    this.advancePC();
    return byte;
  }

  readWordPartsFromPcAdvance() {
    const lo = this.readFromPcAdvance();
    const hi = this.readFromPcAdvance();
    return { hi, lo };
  }

  readWordFromPcAdvance() {
    const lo = this.readFromPcAdvance();
    const hi = this.readFromPcAdvance();
    return ((hi << 8) | lo);
  }

  advancePC(count = 1) {
    this.registers.pc += count;
  }

  setFlags(flags) {
    const { c = 0, n = 0, p_v = 0, h = 0, z = 0, s = 0 } = flags;
    const f = (c << Z80Flags.C) | (n << Z80Flags.N) | (p_v << Z80Flags.P) |
      (h << Z80Flags.H) | (z << Z80Flags.Z) | (s << Z80Flags.S);
    this.registers.f = f;
  }

  readFlags() {
    const f = this.registers.f;
    const c = toBit(f & Z80FlagMasks.C),
      n = toBit(f & Z80FlagMasks.N),
      p_v = toBit(f & Z80FlagMasks.P),
      h = toBit(f & Z80FlagMasks.H),
      z = toBit(f & Z80FlagMasks.Z),
      s = toBit(f & Z80FlagMasks.S);

    return { c, n, p_v, h, z, s };
  }

  sub_08(dst, op) {
    const result = dst - op;
    const a = result & 0x0ff;
    const c = toBit(result & ~0x0ff);
    const s = toBit(result & 0x080);
    const z = toBit(a === 0);
    const half = (dst & 0x0f) + (op & 0x0f);
    const h = toBit(half & 0x010);
    const p = parity8(a);
    const seven = (dst & 0x07f) + (op & 0x07f);
    const v = toBit(seven & 0x080);

    return { a, s, z, h, p, v, c };
  }

  nop() {
    this.setT(4);
  }

  halt() {
    this.setT(4);
    this.halted = true;
  }

  ld_16_imm() {
    this.setT(10);
    return this.readWordPartsFromPcAdvance();
  }

  ld_bc_imm() {
    const { lo, hi } = this.ld_16_imm()

    this.registers.c = lo;
    this.registers.b = hi;
  }

  ld_hl_imm() {
    const { lo, hi } = this.ld_16_imm()

    this.registers.l = lo;
    this.registers.h = hi;
  }

  ld_de_imm() {
    const { lo, hi } = this.ld_16_imm()

    this.registers.e = lo;
    this.registers.d = hi;
  }

  ld_ptr_16_a(addr) {
    this.setT(7);
    const a = this.registers.a;

    this.bus.writeOne(addr, a);
  }

  ld_ptr_bc_a() {
    this.ld_ptr_16_a(this.bc);
  }

  ld_ptr_de_a() {
    this.ld_ptr_16_a(this.de);
  }

  ld_ptr_imm_hl() {
    this.setT(20);
    const addr = this.readWordFromPcAdvance();
    const l = this.registers.l;
    const h = this.registers.h;

    this.bus.writeMany(addr, [l, h]);
  }

  inc_16(value) {
    this.setT(6);
    return value + 1;
  }

  inc_bc() {
    this.bc = this.inc_16(this.bc);
  }

  inc_de() {
    this.de = this.inc_16(this.de);
  }

  inc_hl() {
    this.hl = this.inc_16(this.hl);
  }

  dec_16(value) {
    this.setT(6);
    return value - 1;
  }

  dec_bc() {
    this.bc = this.dec_16(this.bc);
  }

  dec_de() {
    this.de = this.dec_16(this.de);
  }

  dec_hl() {
    this.hl = this.dec_16(this.hl);
  }

  inc_08(value) {
    this.setT(4);
    const { a, s, z, h, v } = add8(value, 1);

    const f = this.readFlags();
    f.n = 0;
    f.p_v = v;
    f.h = h;
    f.z = z;
    f.s = s;
    this.setFlags(f);

    return a;
  }

  inc_b() {
    this.registers.b = this.inc_08(this.registers.b);
  }

  inc_c() {
    this.registers.c = this.inc_08(this.registers.c);
  }

  inc_d() {
    this.registers.d = this.inc_08(this.registers.d);
  }

  inc_e() {
    this.registers.e = this.inc_08(this.registers.e);
  }

  inc_h() {
    this.registers.h = this.inc_08(this.registers.h);
  }

  dec_08(value) {
    this.setT(4);
    const [clamp, v] = clamp8(value - 1);
    const half = clamp4(value)[0] - 1;

    const f = this.readFlags();
    f.n = 0;
    f.p_v = v;
    f.h = toBit(half < 0);
    f.z = toBit(clamp === 0);
    f.s = toBit((clamp & 0x80) > 0);
    this.setFlags(f);

    return clamp;
  }

  dec_b() {
    this.registers.b = this.dec_08(this.registers.b);
  }

  dec_c() {
    this.registers.c = this.dec_08(this.registers.c);
  }

  dec_d() {
    this.registers.d = this.dec_08(this.registers.d);
  }

  dec_e() {
    this.registers.e = this.dec_08(this.registers.e);
  }

  dec_h() {
    this.registers.h = this.dec_08(this.registers.h);
  }

  ld_08_imm() {
    this.setT(7);
    return this.readFromPcAdvance();
  }

  ld_a_imm() {
    this.registers.a = this.ld_08_imm();
  }

  ld_b_imm() {
    this.registers.b = this.ld_08_imm();
  }

  ld_c_imm() {
    this.registers.c = this.ld_08_imm();
  }

  ld_d_imm() {
    this.registers.d = this.ld_08_imm();
  }

  ld_e_imm() {
    this.registers.e = this.ld_08_imm();
  }

  ld_h_imm() {
    this.registers.h = this.ld_08_imm();
  }

  rlXa() {
    this.setT(4);
    const rla = this.registers.a << 1;
    const { hi, lo } = splitHiLo(rla);
    const c = hi;

    const f = this.readFlags();
    f.n = 0;
    f.c = c;
    f.h = 0;
    this.setFlags(f);

    return { a: lo, c };
  }

  rlca() {
    const { a, c } = this.rlXa();
    this.registers.a = a | c;
  }

  rla() {
    const { a } = this.rlXa();
    this.registers.a = a;
  }

  rrXa() {
    this.setT(4);
    const c = this.registers.a % 2;
    const rra = this.registers.a >> 1;

    const f = this.readFlags();
    f.n = 0;
    f.c = c;
    f.h = 0;
    this.setFlags(f);

    return { a: rra, c}
  }

  rrca() {
    const { a, c } = this.rrXa();
    this.registers.a = a | (c << 7);;
  }

  rra() {
    const { a } = this.rrXa();
    this.registers.a = a;
  }

  ex_af() {
    this.setT(4);
    const a = this.registers.a, f = this.registers.f;
    this.registers.a = this.registers.a$;
    this.registers.f = this.registers.f$;
    this.registers.a$ = a;
    this.registers.f$ = f;
  }

  add_hl_16(value) {
    this.setT(11);
    const hl = this.hl + value;
    this.hl = hl;

    const f = this.readFlags();
    f.n = 1;
    f.c = toBit(hl > 0x0ffff);
    this.setFlags(f);
  }

  add_hl_bc() {
    this.add_hl_16(this.bc);
  }

  add_hl_de() {
    this.add_hl_16(this.de);
  }

  ld_a_ptr_16(value) {
    this.setT(7);
    const a = this.bus.readOne(value);
    this.registers.a = a;
  }

  ld_a_ptr_bc() {
    this.ld_a_ptr_16(this.bc);
  }

  ld_a_ptr_de() {
    this.ld_a_ptr_16(this.bc);
  }

  jr_08() {
    this.setT(12);
    return signed8(this.readFromPcAdvance());
  }

  djnz_imm() {
    const offset = this.jr_08();
    const b = this.registers.b - 1;
    this.registers.b = b;

    if (b) {
      this.setT(13);
      this.registers.pc += offset;
    } else {
      this.setT(8);
    }
  }

  jr_imm() {
    const offset = this.jr_08();
    this.registers.pc += offset;
  }

  jr_nz_imm() {
    const offset = this.jr_08();

    if (this.flagNotSet(Z80FlagMasks.Z)) {
      this.registers.pc += offset;
    } else {
      this.setT(7);
    }
  }

  daa() {
    this.setT(4);
  }

  registerInstructions() {
    this.inst = {};
    const ref = this.inst;
    ref[inst.nop] = this.nop;
    ref[inst.ld_bc_imm] = this.ld_bc_imm;
    ref[inst.ld_ptr_bc_a] = this.ld_ptr_bc_a;
    ref[inst.inc_bc] = this.inc_bc;
    ref[inst.inc_b] = this.inc_b;
    ref[inst.dec_b] = this.dec_b;
    ref[inst.ld_b_imm] = this.ld_b_imm;
    ref[inst.rlca] = this.rlca;

    ref[inst.ex_af] = this.ex_af;
    ref[inst.add_hl_bc] = this.add_hl_bc;
    ref[inst.ld_a_ptr_bc] = this.ld_a_ptr_bc;
    ref[inst.dec_bc] = this.dec_bc;
    ref[inst.inc_c] = this.inc_c;
    ref[inst.dec_c] = this.dec_c;
    ref[inst.ld_c_imm] = this.ld_c_imm;
    ref[inst.rrca] = this.rrca;

    ref[inst.djnz_imm] = this.djnz_imm;
    ref[inst.ld_de_imm] = this.ld_de_imm;
    ref[inst.ld_ptr_de_a] = this.ld_ptr_de_a;
    ref[inst.inc_de] = this.inc_de;
    ref[inst.inc_d] = this.inc_d;
    ref[inst.dec_d] = this.dec_d;
    ref[inst.ld_d_imm] = this.ld_d_imm;
    ref[inst.rla] = this.rla;

    ref[inst.jr_imm] = this.jr_imm;
    ref[inst.add_hl_de] = this.add_hl_de;
    ref[inst.ld_a_ptr_de] = this.ld_a_ptr_de;
    ref[inst.dec_de] = this.dec_de;
    ref[inst.inc_e] = this.inc_e;
    ref[inst.dec_e] = this.dec_e;
    ref[inst.ld_e_imm] = this.ld_e_imm;
    ref[inst.rra] = this.rra;

    ref[inst.jr_nz_imm] = this.jr_nz_imm;
    ref[inst.ld_hl_imm] = this.ld_hl_imm;
    ref[inst.ld_ptr_imm_hl] = this.ld_ptr_imm_hl;
    ref[inst.inc_hl] = this.inc_hl;
    ref[inst.inc_h] = this.inc_h;
    ref[inst.dec_h] = this.dec_h;
    ref[inst.ld_h_imm] = this.ld_h_imm;
    // ref[inst.daa] = this.daa;

    // gen.generate('ld bc imm');
    // (\b) (\b)
    // $1_$2
    // g.*'([^']*)'.*
    // ref[inst.$1] = this.$1;

    ref[inst.halt] = this.halt;
    ref[inst.ld_a_imm] = this.ld_a_imm;
    ref[inst.dec_hl] = this.dec_hl;

  }
}

Z80Cpu.INT_MODE_0 = 0;
Z80Cpu.INT_MODE_1 = 1;
Z80Cpu.INT_MODE_2 = 2;

export default Z80Cpu;
