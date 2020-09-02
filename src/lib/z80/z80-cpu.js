import inst from './z80-inst';
import { clamp16, makeWord,
  getLo, getHi, splitHiLo, hex8,
  toBit, signed8, parity8,
  add8, sub8, add16, sub16, adc8, sbc8,
  and8, or8, xor8 } from '../bin-ops';

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

  get af() {
    return this.registers.f | (this.registers.a << 8);
  }

  set af(value) {
    const clamped = clamp16(value);
    this.registers.f = getLo(clamped);
    this.registers.a = getHi(clamped);
  }

  get bc() {
    return this.registers.c + (this.registers.b << 8);
  }

  set bc(value) {
    const clamped = clamp16(value);
    this.registers.c = getLo(clamped);
    this.registers.b = getHi(clamped);
  }

  get de() {
    return this.registers.e + (this.registers.d << 8);
  }

  set de(value) {
    const clamped = clamp16(value);
    this.registers.e = getLo(clamped);
    this.registers.d = getHi(clamped);
  }

  get hl() {
    return this.registers.l + (this.registers.h << 8);
  }

  set hl(value) {
    const clamped = clamp16(value);
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

  readWord(addr) {
    const values = this.bus.readMany(addr, 2);
    return (((values[1] & 0x0ff) << 8) | (values[0] & 0x0ff)) & 0x0ffff;
  }

  writeWord(addr, word) {
    const hi = ((word & 0x0ff00) >> 8) & 0x0ff;
    const lo = word & 0x0ff;
    this.bus.writeMany(addr, [lo, hi]);
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
    this.registers.pc = clamp16(this.registers.pc + count);
  }

  reversePC(count = 1) {
    this.registers.pc = clamp16(this.registers.pc - count);
  }

  setFlags(flags) {
    const { c = 0, n = 0, p_v = 0, h = 0, z = 0, s = 0 } = flags;
    const f = (c << Z80Flags.C) | (n << Z80Flags.N) | (p_v << Z80Flags.P) |
      (h << Z80Flags.H) | (z << Z80Flags.Z) | (s << Z80Flags.S);
    this.registers.f = f;
  }

  getFlags() {
    const f = this.registers.f;
    const c = toBit(f & Z80FlagMasks.C),
      n = toBit(f & Z80FlagMasks.N),
      p_v = toBit(f & Z80FlagMasks.P),
      h = toBit(f & Z80FlagMasks.H),
      z = toBit(f & Z80FlagMasks.Z),
      s = toBit(f & Z80FlagMasks.S);

    return { c, n, p_v, h, z, s };
  }

  nop() {
    this.setT(4);
  }

  halt() {
    this.setT(4);
    this.reversePC();
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

  ld_sp_imm() {
    const bytes = this.ld_16_imm()
    this.registers.sp = makeWord(bytes);
  }

  ld_hl_ptr_imm() {
    this.setT(20);
    const addr = this.readWordFromPcAdvance();
    const values = this.bus.readMany(addr, 2);
    this.registers.l = values[0];
    this.registers.h = values[1];
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

  ld_ptr_hl_imm() {
    this.setT(10);
    const addr = this.hl;
    const value = this.readFromPcAdvance();

    this.bus.writeOne(addr, value);
  }

  ld_ptr_imm_a() {
    this.setT(13);
    const addr = this.readWordFromPcAdvance();

    this.bus.writeOne(addr, this.registers.a);
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
    const { a } = add16(value, 1);

    return a;
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

  inc_sp() {
    this.registers.sp = this.inc_16(this.registers.sp);
  }

  dec_16(value) {
    this.setT(6);
    const { a } = sub16(value, 1);

    return a;
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

  dec_sp() {
    this.registers.sp = this.dec_16(this.registers.sp);
  }

  inc_08(value) {
    this.setT(4);
    const { a, s, z, h, v, n } = add8(value, 1);

    const f = this.getFlags();
    f.n = n;
    f.p_v = v;
    f.h = h;
    f.z = z;
    f.s = s;
    this.setFlags(f);

    return a;
  }

  make_inc_r8(dst) {
    return () => {
      this.registers[dst] = this.inc_08(this.registers[dst]);
    }
  }

  register_inc_r8(ref) {
    // covers the majority of 0x40 through 0x7f
    // misses ptr hl variants and halt (0x76)
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let dst of r8List) {
      const key = `inc_${dst}`;
      ref[inst[key]] = this.make_inc_r8(dst);
    }
  }

  inc_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    const after = this.inc_08(value);
    this.bus.writeOne(addr, after);
    this.setT(11);
  }

  dec_08(value) {
    this.setT(4);
    const { a, s, z, h, v, n } = sub8(value, 1);

    const f = this.getFlags();
    f.n = n;
    f.p_v = v;
    f.h = h;
    f.z = z;
    f.s = s;
    this.setFlags(f);

    return a;
  }

  make_dec_r8(dst) {
    return () => {
      this.registers[dst] = this.dec_08(this.registers[dst]);
    }
  }

  register_dec_r8(ref) {
    // covers the majority of 0x40 through 0x7f
    // misses ptr hl variants and halt (0x76)
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let dst of r8List) {
      const key = `dec_${dst}`;
      ref[inst[key]] = this.make_dec_r8(dst);
    }
  }

  dec_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    const after = this.dec_08(value);
    this.bus.writeOne(addr, after);
    this.setT(11);
  }

  ld_08_imm() {
    this.setT(7);
    return this.readFromPcAdvance();
  }

  make_ld_r8_imm(dst) {
    return () => {
      this.registers[dst] = this.ld_08_imm();
    }
  }

  register_ld_r8_imm(ref) {
    // covers the majority of 0x40 through 0x7f
    // misses ptr hl variants and halt (0x76)
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let dst of r8List) {
      const key = `ld_${dst}_imm`;
      ref[inst[key]] = this.make_ld_r8_imm(dst);
    }
  }

  rlXa() {
    this.setT(4);
    const rla = this.registers.a << 1;
    const { hi, lo } = splitHiLo(rla);
    const c = hi;

    const f = this.getFlags();
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

    const f = this.getFlags();
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
    const { a, h, n, c } = add16(this.hl, value);
    this.hl = a;

    const f = this.getFlags();
    f.n = n;
    f.c = c;
    f.h = h;
    this.setFlags(f);
  }

  add_hl_bc() {
    this.add_hl_16(this.bc);
  }

  add_hl_de() {
    this.add_hl_16(this.de);
  }

  add_hl_hl() {
    this.add_hl_16(this.hl);
  }

  add_hl_sp() {
    this.add_hl_16(this.registers.sp);
  }

  ld_a_ptr_16(addr) {
    this.setT(7);
    const a = this.bus.readOne(addr);
    this.registers.a = a;
  }

  ld_a_ptr_bc() {
    this.ld_a_ptr_16(this.bc);
  }

  ld_a_ptr_de() {
    this.ld_a_ptr_16(this.bc);
  }

  ld_a_ptr_imm() {
    const addr = this.readWordFromPcAdvance();
    this.ld_a_ptr_16(addr);
    this.setT(13);
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

  jr_cond_imm(condFn) {
    const offset = this.jr_08();

    if (condFn()) {
      this.registers.pc += offset;
    } else {
      this.setT(7);
    }
  }

  jr_not_cond_imm(mask) {
    this.jr_cond_imm(() => this.flagNotSet(mask));
  }

  jr_on_cond_imm(mask) {
    this.jr_cond_imm(() => this.flagIsSet(mask));
  }

  jr_nz_imm() {
    this.jr_not_cond_imm(Z80FlagMasks.Z);
  }

  jr_z_imm() {
    this.jr_on_cond_imm(Z80FlagMasks.Z);
  }

  jr_nc_imm() {
    this.jr_not_cond_imm(Z80FlagMasks.C);
  }

  jr_c_imm() {
    this.jr_on_cond_imm(Z80FlagMasks.C);
  }

  daa() {
    this.setT(4);

    const f = this.getFlags();
    let a = this.registers.a;
    const hn = (a & 0x0f0) >> 4;
    const ln = (a & 0x0f);

    let diff;
    if (f.c) {
      if (ln >= 0x0a) {
        diff = 0x066;
      } else {
        if (f.h) {
          diff = 0x066;
        } else {
          diff = 0x060;
        }
      }
    } else {  // !f.c
      if (ln >= 0x0a) {
        if (hn >= 0x09) {
          diff = 0x066;
        } else {
          diff = 0x06;
        }
      } else {
        if (f.h) {
          if (hn >= 0x0a) {
            diff = 0x066;
          } else {
            diff = 0x06;
          }
        } else {  // !f.h
          if (hn >= 0x0a) {
            diff = 0x060;
          } else {
            diff = 0;
          }
        }
      }
    }

    a = (f.n) ? a - diff : a + diff;

    let c;
    if (f.c) {
      c = f.c;
    } else {
      if (ln >= 0x0a) {
        if (hn >= 0x09) {
          c = 1;
        } else {
          c = 0;
        }
      } else {
        if (hn >= 0x0a) {
          c = 1;
        } else {
          c = 0;
        }
      }
    }

    let h;
    if (f.n) {
      if (f.h) {
        if (ln >= 6) {
          h = 0;
        } else {
          h = 1;
        }
      } else {  // !f.h
        h = 0;
      }
    } else {  // !f.n
      if (ln >= 0x0a) {
        h = 1;
      } else {
        h = 0;
      }
    }

    this.registers.a = a;
    f.c = c;
    f.h = h;
    f.p_v = parity8(a);
    f.z = toBit(a === 0);
    f.s = toBit(a & 0x080);
    this.setFlags(f);
  }

  add_08(value) {
    const { a, s, z, h, v, n, c } = add8(this.registers.a, value);
    this.registers.a = a;

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = v;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  add_a_r8(value) {
    this.setT(4);
    this.add_08(value);
  }

  make_add_a_r8(src) {
    return () => {
      this.add_a_r8(this.registers[src]);
    }
  }

  register_add_a_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `add_a_${src}`;
      ref[inst[key]] = this.make_add_a_r8(src);
    }
  }

  add_a_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.add_08(value);
  }

  add_a_imm() {
    const value = this.readFromPcAdvance();
    this.setT(7);
    this.add_08(value);
  }

  adc_08(value) {
    const f = this.getFlags();
    const { a, s, z, h, v, n, c } = adc8(this.registers.a, value, f.c);
    this.registers.a = a;

    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = v;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  adc_a_r8(value) {
    this.setT(4);
    this.adc_08(value);
  }

  make_adc_a_r8(src) {
    return () => {
      this.adc_a_r8(this.registers[src]);
    }
  }

  register_adc_a_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `adc_a_${src}`;
      ref[inst[key]] = this.make_adc_a_r8(src);
    }
  }

  adc_a_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.adc_08(value);
  }

  adc_a_imm() {
    const value = this.readFromPcAdvance();
    this.setT(7);
    this.adc_08(value);
  }

  sub_08(value) {
    const { a, s, z, h, v, n, c } = sub8(this.registers.a, value);
    this.registers.a = a;

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = v;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  sub_r8(value) {
    this.setT(4);
    this.sub_08(value);
  }

  make_sub_r8(src) {
    return () => {
      this.sub_r8(this.registers[src]);
    }
  }

  register_sub_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `sub_${src}`;
      ref[inst[key]] = this.make_sub_r8(src);
    }
  }

  sub_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.sub_08(value);
  }

  sub_imm() {
    const value = this.readFromPcAdvance();
    this.setT(7);
    this.sub_08(value);
  }

  sbc_08(value) {
    const f = this.getFlags();
    const { a, s, z, h, v, n, c } = sbc8(this.registers.a, value, f.c);
    this.registers.a = a;

    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = v;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  sbc_a_r8(value) {
    this.setT(4);
    this.sbc_08(value);
  }

  make_sbc_a_r8(src) {
    return () => {
      this.sbc_a_r8(this.registers[src]);
    }
  }

  register_sbc_a_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `sbc_a_${src}`;
      ref[inst[key]] = this.make_sbc_a_r8(src);
    }
  }

  sbc_a_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.sbc_08(value);
  }

  sbc_a_imm() {
    const value = this.readFromPcAdvance();
    this.setT(7);
    this.sbc_08(value);
  }

  cpl() {
    this.setT(4);
    const a = ~this.registers.a & 0x0ff;
    this.registers.a = a;

    const f = this.getFlags();
    f.h = 1;
    f.n = 1;
    this.setFlags(f);
  }

  scf() {
    this.setT(4);
    const f = { ...this.getFlags(), c:1, h:0, n:0 };
    this.setFlags(f);
  }

  ccf() {
    this.setT(4);
    const f = { ...this.getFlags(), n:0 };
    f.h = f.c;
    f.c = toBit(! f.c);
    this.setFlags(f);
  }

  make_ld_r8_r8(dst, src) {
    return () => {
      this.setT(4);
      this.registers[dst] = this.registers[src];
    };
  }

  register_ld_r8_r8(ref) {
    // covers the majority of 0x40 through 0x7f
    // misses ptr hl variants and halt (0x76)
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let dst of r8List) {
      for (let src of r8List) {
        const instKey = `ld_${dst}_${src}`;
        ref[inst[instKey]] = this.make_ld_r8_r8(dst, src);
      }
    }
  }

  make_ld_r8_ptr_hl(dst) {
    return () => {
      this.setT(7);
      const value = this.bus.readOne(this.hl);
      this.registers[dst] = value;
    };
  }

  register_ld_r8_ptr_hl(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let dst of r8List) {
      const instKey = `ld_${dst}_ptr_hl`;
      ref[inst[instKey]] = this.make_ld_r8_ptr_hl(dst);
    }
  }

  make_ld_ptr_hl_r8(src) {
    return () => {
      this.setT(7);
      const value = this.registers[src];
      this.bus.writeOne(this.hl, value);
    };
  }

  register_ld_ptr_hl_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const instKey = `ld_ptr_hl_${src}`;
      ref[inst[instKey]] = this.make_ld_ptr_hl_r8(src);
    }
  }

  and_08(value) {
    const { a, s, z, h, p, n, c } = and8(this.registers.a, value);
    this.registers.a = a;

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = p;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  and_r8(value) {
    this.setT(4);
    this.and_08(value);
  }

  make_and_r8(src) {
    return () => {
      this.and_r8(this.registers[src]);
    }
  }

  register_and_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `and_${src}`;
      ref[inst[key]] = this.make_and_r8(src);
    }
  }

  and_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.and_08(value);
  }

  or_08(value) {
    const { a, s, z, h, p, n, c } = or8(this.registers.a, value);
    this.registers.a = a;

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = p;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  or_r8(value) {
    this.setT(4);
    this.or_08(value);
  }

  make_or_r8(src) {
    return () => {
      this.or_r8(this.registers[src]);
    }
  }

  register_or_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `or_${src}`;
      ref[inst[key]] = this.make_or_r8(src);
    }
  }

  or_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.or_08(value);
  }

  xor_08(value) {
    const { a, s, z, h, p, n, c } = xor8(this.registers.a, value);
    this.registers.a = a;

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = p;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  xor_r8(value) {
    this.setT(4);
    this.xor_08(value);
  }

  make_xor_r8(src) {
    return () => {
      this.xor_r8(this.registers[src]);
    }
  }

  register_xor_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `xor_${src}`;
      ref[inst[key]] = this.make_xor_r8(src);
    }
  }

  xor_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.xor_08(value);
  }

  cp_08(value) {
    const { s, z, h, v, n, c } = sub8(this.registers.a, value);

    const f = this.getFlags();
    f.s = s;
    f.z = z;
    f.h = h;
    f.p_v = v;
    f.n = n;
    f.c = c;
    this.setFlags(f);
  }

  cp_r8(value) {
    this.setT(4);
    this.cp_08(value);
  }

  make_cp_r8(src) {
    return () => {
      this.cp_r8(this.registers[src]);
    }
  }

  register_cp_r8(ref) {
    const r8List = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let src of r8List) {
      const key = `cp_${src}`;
      ref[inst[key]] = this.make_cp_r8(src);
    }
  }

  cp_ptr_hl() {
    const addr = this.hl;
    const value = this.bus.readOne(addr);
    this.setT(7);
    this.cp_08(value);
  }

  make_call_cond_imm(condFn) {
    return () => {
      const newPc = this.readWordFromPcAdvance();
      if (condFn()) {
        this.setT(17);
        this.call_imm_internal(newPc);
      } else {
        this.setT(10);
      }
    };
  }

  register_call_cond_imm(ref) {
    ref[inst.call_nz_imm] = this.make_call_cond_imm(() => this.flagNotSet(Z80FlagMasks.Z));
    ref[inst.call_z_imm] = this.make_call_cond_imm(() => this.flagIsSet(Z80FlagMasks.Z));
    ref[inst.call_nc_imm] = this.make_call_cond_imm(() => this.flagNotSet(Z80FlagMasks.C));
    ref[inst.call_c_imm] = this.make_call_cond_imm(() => this.flagIsSet(Z80FlagMasks.C));
    ref[inst.call_po_imm] = this.make_call_cond_imm(() => this.flagNotSet(Z80FlagMasks.P));
    ref[inst.call_pe_imm] = this.make_call_cond_imm(() => this.flagIsSet(Z80FlagMasks.P));
    ref[inst.call_p_imm] = this.make_call_cond_imm(() => this.flagNotSet(Z80FlagMasks.S));
    ref[inst.call_m_imm] = this.make_call_cond_imm(() => this.flagIsSet(Z80FlagMasks.S));
  }

  make_ret_cond(condFn) {
    return () => {
      if (condFn()) {
        this.setT(11);
        this.ret_internal();
      } else {
        this.setT(5);
      }
    };
  }

  register_ret_cond(ref) {
    ref[inst.ret_nz] = this.make_ret_cond(() => this.flagNotSet(Z80FlagMasks.Z));
    ref[inst.ret_z] = this.make_ret_cond(() => this.flagIsSet(Z80FlagMasks.Z));
    ref[inst.ret_nc] = this.make_ret_cond(() => this.flagNotSet(Z80FlagMasks.C));
    ref[inst.ret_c] = this.make_ret_cond(() => this.flagIsSet(Z80FlagMasks.C));
    ref[inst.ret_po] = this.make_ret_cond(() => this.flagNotSet(Z80FlagMasks.P));
    ref[inst.ret_pe] = this.make_ret_cond(() => this.flagIsSet(Z80FlagMasks.P));
    ref[inst.ret_p] = this.make_ret_cond(() => this.flagNotSet(Z80FlagMasks.S));
    ref[inst.ret_m] = this.make_ret_cond(() => this.flagIsSet(Z80FlagMasks.S));
  }

  call_imm() {
    this.setT(17);
    const newPc = this.readWordFromPcAdvance();
    this.call_imm_internal(newPc);
  }

  call_imm_internal(pc) {
    const sp = (this.registers.sp - 2) & 0x0ffff;
    this.writeWord(sp, this.registers.pc);
    this.registers.sp = sp;
    this.registers.pc = pc;
  }

  ret() {
    this.setT(10);
    this.ret_internal();
  }

  ret_internal() {
    const sp = this.registers.sp
    const newPc = this.readWord(sp);
    this.registers.sp = (sp + 2) & 0x0ffff;
    this.registers.pc = newPc;
  }

  jp_imm_internal(pc) {
    this.registers.pc = pc;
  }

  jp_imm() {
    this.setT(10)
    const newPc = this.readWordFromPcAdvance();
    this.jp_imm_internal(newPc);
  }

  make_jp_cond_imm(condFn) {
    return () => {
      const newPc = this.readWordFromPcAdvance();
      this.setT(10);
      if (condFn()) {
        this.jp_imm_internal(newPc);
      }
    };
  }

  register_jp_cond_imm(ref) {
    ref[inst.jp_nz_imm] = this.make_jp_cond_imm(() => this.flagNotSet(Z80FlagMasks.Z));
    ref[inst.jp_z_imm] = this.make_jp_cond_imm(() => this.flagIsSet(Z80FlagMasks.Z));
    ref[inst.jp_nc_imm] = this.make_jp_cond_imm(() => this.flagNotSet(Z80FlagMasks.C));
    ref[inst.jp_c_imm] = this.make_jp_cond_imm(() => this.flagIsSet(Z80FlagMasks.C));
    ref[inst.jp_po_imm] = this.make_jp_cond_imm(() => this.flagNotSet(Z80FlagMasks.P));
    ref[inst.jp_pe_imm] = this.make_jp_cond_imm(() => this.flagIsSet(Z80FlagMasks.P));
    ref[inst.jp_p_imm] = this.make_jp_cond_imm(() => this.flagNotSet(Z80FlagMasks.S));
    ref[inst.jp_m_imm] = this.make_jp_cond_imm(() => this.flagIsSet(Z80FlagMasks.S));
  }

  make_push_r16(getter) {
    return () => {
      this.setT(11);
      const sp = (this.registers.sp - 2) & 0x0ffff;
      this.writeWord(sp, getter());
      this.registers.sp = sp;
    };
  }

  register_push_r16(ref) {
    ref[inst.push_af] = this.make_push_r16(() => this.af);
    ref[inst.push_bc] = this.make_push_r16(() => this.bc);
    ref[inst.push_de] = this.make_push_r16(() => this.de);
    ref[inst.push_hl] = this.make_push_r16(() => this.hl);
  }

  make_pop_r16(setter) {
    return () => {
      this.setT(10);
      const sp = this.registers.sp
      const value = this.readWord(sp);
      this.registers.sp = (sp + 2) & 0x0ffff;
      setter(value);
    };
  }

  register_pop_r16(ref) {
    ref[inst.pop_af] = this.make_pop_r16((value) => { this.af = value; });
    ref[inst.pop_bc] = this.make_pop_r16((value) => { this.bc = value; });
    ref[inst.pop_de] = this.make_pop_r16((value) => { this.de = value; });
    ref[inst.pop_hl] = this.make_pop_r16((value) => { this.hl = value; });
  }

  make_rst_off(offset) {
    return () => {
      const sp = clamp16(this.registers.sp - 2);
      this.writeWord(sp, this.registers.pc);
      this.registers.sp = sp;
      this.registers.pc = offset;
    };
  }

  register_rst_off(ref) {
    let offset = 0;
    while (offset <= 0x38) {
      const hex = hex8(offset);
      ref[inst[`rst_${hex}`]] = this.make_rst_off(offset);
      offset += 8;
    }
  }

  registerInstructions() {
    this.inst = {};
    const ref = this.inst;
    ref[inst.nop] = this.nop;
    ref[inst.ld_bc_imm] = this.ld_bc_imm;
    ref[inst.ld_ptr_bc_a] = this.ld_ptr_bc_a;
    ref[inst.inc_bc] = this.inc_bc;
    ref[inst.rlca] = this.rlca;

    ref[inst.ex_af] = this.ex_af;
    ref[inst.add_hl_bc] = this.add_hl_bc;
    ref[inst.ld_a_ptr_bc] = this.ld_a_ptr_bc;
    ref[inst.dec_bc] = this.dec_bc;
    ref[inst.rrca] = this.rrca;

    ref[inst.djnz_imm] = this.djnz_imm;
    ref[inst.ld_de_imm] = this.ld_de_imm;
    ref[inst.ld_ptr_de_a] = this.ld_ptr_de_a;
    ref[inst.inc_de] = this.inc_de;
    ref[inst.rla] = this.rla;

    ref[inst.jr_imm] = this.jr_imm;
    ref[inst.add_hl_de] = this.add_hl_de;
    ref[inst.ld_a_ptr_de] = this.ld_a_ptr_de;
    ref[inst.dec_de] = this.dec_de;
    ref[inst.rra] = this.rra;

    ref[inst.jr_nz_imm] = this.jr_nz_imm;
    ref[inst.ld_hl_imm] = this.ld_hl_imm;
    ref[inst.ld_ptr_imm_hl] = this.ld_ptr_imm_hl;
    ref[inst.inc_hl] = this.inc_hl;
    ref[inst.daa] = this.daa;

    ref[inst.jr_z_imm] = this.jr_z_imm;
    ref[inst.add_hl_hl] = this.add_hl_hl;
    ref[inst.ld_hl_ptr_imm] = this.ld_hl_ptr_imm;
    ref[inst.dec_hl] = this.dec_hl;
    ref[inst.cpl] = this.cpl;

    ref[inst.jr_nc_imm] = this.jr_nc_imm;
    ref[inst.ld_sp_imm] = this.ld_sp_imm;
    ref[inst.ld_ptr_imm_a] = this.ld_ptr_imm_a;
    ref[inst.inc_sp] = this.inc_sp;
    ref[inst.inc_ptr_hl] = this.inc_ptr_hl;
    ref[inst.dec_ptr_hl] = this.dec_ptr_hl;
    ref[inst.ld_ptr_hl_imm] = this.ld_ptr_hl_imm;
    ref[inst.scf] = this.scf;

    ref[inst.jr_c_imm] = this.jr_c_imm;
    ref[inst.add_hl_sp] = this.add_hl_sp;
    ref[inst.ld_a_ptr_imm] = this.ld_a_ptr_imm;
    ref[inst.dec_sp] = this.dec_sp;
    ref[inst.ccf] = this.ccf;

    this.register_ld_r8_imm(ref);
    this.register_inc_r8(ref);
    this.register_dec_r8(ref);

    this.register_ld_r8_r8(ref);
    this.register_ld_r8_ptr_hl(ref);
    this.register_ld_ptr_hl_r8(ref);
    ref[inst.halt] = this.halt;

    this.register_add_a_r8(ref);
    ref[inst.add_a_ptr_hl] = this.add_a_ptr_hl;

    this.register_adc_a_r8(ref);
    ref[inst.adc_a_ptr_hl] = this.adc_a_ptr_hl;

    this.register_sub_r8(ref);
    ref[inst.sub_ptr_hl] = this.sub_ptr_hl;

    this.register_sbc_a_r8(ref);
    ref[inst.sbc_a_ptr_hl] = this.sbc_a_ptr_hl;

    this.register_and_r8(ref);
    ref[inst.and_ptr_hl] = this.and_ptr_hl;

    this.register_or_r8(ref);
    ref[inst.or_ptr_hl] = this.or_ptr_hl;

    this.register_xor_r8(ref);
    ref[inst.xor_ptr_hl] = this.xor_ptr_hl;

    this.register_cp_r8(ref);
    ref[inst.cp_ptr_hl] = this.cp_ptr_hl;

    this.register_ret_cond(ref);
    this.register_call_cond_imm(ref);
    this.register_jp_cond_imm(ref);
    this.register_push_r16(ref);
    this.register_pop_r16(ref);

    ref[inst.jp_imm] = this.jp_imm;
    ref[inst.add_a_imm] = this.add_a_imm;

    this.register_rst_off(ref);

    ref[inst.ret] = this.ret;
    // ref[inst.pre_bit] = this.pre_bit;
    ref[inst.call_imm] = this.call_imm;
    ref[inst.adc_a_imm] = this.adc_a_imm;

    // ref[inst.out_ptr_imm_a] = this.out_ptr_imm_a;
    ref[inst.sub_imm] = this.sub_imm;

    // ref[inst.exx] = this.exx;
    // ref[inst.in_a_ptr_imm] = this.in_a_ptr_imm;
    // ref[inst.pre_ix] = this.pre_ix;
    ref[inst.sbc_a_imm] = this.sbc_a_imm;

    // ref[inst.ex_ptr_sp_hl] = this.ex_ptr_sp_hl;
    // ref[inst.and_imm] = this.and_imm;

    // ref[inst.jp_ptr_hl] = this.jp_ptr_hl;
    // ref[inst.ex_de_hl] = this.ex_de_hl;
    // ref[inst.pre_80] = this.pre_80;
    // ref[inst.xor_imm] = this.xor_imm;

    // ref[inst.di] = this.di;
    // ref[inst.or_imm] = this.or_imm;

    // ref[inst.ld_sp_hl] = this.ld_sp_hl;
    // ref[inst.ei] = this.ei;
    // ref[inst.pre_iy] = this.pre_iy;
    // ref[inst.cp_imm] = this.cp_imm;

    // gen.generate('ld bc imm');
    // (\b) (\b)
    // $1_$2
    // g.*'([^']*)'.*
    // ref[inst.$1] = this.$1;
  }
}

Z80Cpu.INT_MODE_0 = 0;
Z80Cpu.INT_MODE_1 = 1;
Z80Cpu.INT_MODE_2 = 2;

export default Z80Cpu;
