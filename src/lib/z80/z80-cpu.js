import {
  Z80Instructions as inst,
  Z80Extended as ext,
  Z80Bit as bit,
  Z80Index as index,
  Z80IndexBit as index_bit } from './z80-inst';
import { clamp8, clamp16, makeWord,
  getLo, getHi, splitHiLo, hex8,
  toBit, signed8, parity8,
  add8, sub8, add16, sub16, adc8, sbc8,
  and8, or8, xor8, sbc16, adc16,
  rlc8, rrc8, rl8, rr8,
  sla8, sra8, srl8 } from '../bin-ops';
import Z80Command from './z80-command'

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

const incVal = (value) => value + 1;
const decVal = (value) => value - 1;
const makeMask = (pos) => ((1 << pos) & 0xff);

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
    this.interruptHandler = this.handleInterruptMode0;
    this.interruptData = null;
    this.halted = false;
    this.tStates = 0;
    this.tStatesEnabled = true;
    this.eiCountdown = 0;
    this.interruptsEnabled = false;
    this.respondsToInterrupts = true;

    this.overriddenPcData = null;
    this.overriddenPcOffset = 0;
    this.overriddenPcCountdown = 0;

    this.inNmi = false;
    this.hasPendingNmi = false;
    this.hasPendingInterrupt = false;
    this.pendingInterruptData = null;

    this.indexRegister = null;
    this.byteOffset = 0;

    this.pendingCommand = null;

    this.registerInstructions();
  }

  registerBus(bus) {
    this.bus = bus;
  }

  get af$() {
    return clamp16(this.registers.f$ | (this.registers.a$ << 8));
  }

  get af() {
    return clamp16(this.registers.f | (this.registers.a << 8));
  }

  set af(value) {
    const clamped = clamp16(value);
    this.registers.f = getLo(clamped);
    this.registers.a = getHi(clamped);
  }

  get bc$() {
    return clamp16(this.registers.c$ | (this.registers.b$ << 8));
  }

  get bc() {
    return clamp16(this.registers.c | (this.registers.b << 8));
  }

  set bc(value) {
    const clamped = clamp16(value);
    this.registers.c = getLo(clamped);
    this.registers.b = getHi(clamped);
  }

  get de$() {
    return clamp16(this.registers.e$ | (this.registers.d$ << 8));
  }

  get de() {
    return clamp16(this.registers.e | (this.registers.d << 8));
  }

  set de(value) {
    const clamped = clamp16(value);
    this.registers.e = getLo(clamped);
    this.registers.d = getHi(clamped);
  }

  get hl$() {
    return clamp16(this.registers.l$ | (this.registers.h$ << 8));
  }

  get hl() {
    return clamp16(this.registers.l | (this.registers.h << 8));
  }

  set hl(value) {
    const clamped = clamp16(value);
    this.registers.l = getLo(clamped);
    this.registers.h = getHi(clamped);
  }

  get ix() {
    return this.registers.ixl + (this.registers.ixh << 8);
  }

  set ix(value) {
    const clamped = clamp16(value);
    this.registers.ixl = getLo(clamped);
    this.registers.ixh = getHi(clamped);
  }

  get iy() {
    return this.registers.iyl + (this.registers.iyh << 8);
  }

  set iy(value) {
    const clamped = clamp16(value);
    this.registers.iyl = getLo(clamped);
    this.registers.iyh = getHi(clamped);
  }

  get sp() {
    return this.registers.sp;
  }

  set sp(value) {
    return this.registers.sp = clamp16(value);
  }

  flagIsSet(mask) {
    return this.registers.f & mask;
  }

  flagNotSet(mask) {
    return ! (this.registers.f & mask);
  }

  useTStates(use) {
    this.tStatesEnabled = use;
  }

  reset() {
    const reg = this.registers;
    this.registers = { ...reg, iff1: 0, iff2: 0, pc: 0, i: 0, r: 0 };
    this.intMode = Z80Cpu.INT_MODE_0;
    this.interruptHandler = this.handleInterruptMode0;
    this.interruptsEnabled = false;
    this.inNmi = false;
    this.hasPendingNmi = false;
    this.hasPendingInterrupt = false;
    this.pendingInterruptData = null;
    this.halted = false;
  }

  checkEnableInterrupts() {
    if (this.eiCountdown > 0) {
      --this.eiCountdown;
      if (this.eiCountdown === 0) {
        // prepare to enable interrupts after this command
        this.registers.iff1 = 1;
        this.registers.iff2 = 1;
      }
    }
  }

  raiseNmi() {
    if (this.inNmi) { return; }

    this.hasPendingNmi = true;
  }

  handleNmi() {
    this.setNextCommand(11, () => {
      const reg = this.registers;
      reg.iff1 = 0;
      const addr = clamp16(reg.sp - 2);
      this.writeWord(addr, reg.pc);
      reg.sp = addr;
      reg.pc = 0x0066;
      this.halted = false;
      this.hasPendingNmi = false;
      this.inNmi = true;
    });
  }

  completeNmi() {
    this.bus.completeNmi();
  }

  retn() {
    this.setNextCommand(14, () => {
      this.advancePC();
      const reg = this.registers;
      reg.iff1 = reg.iff2;
      const addr = reg.sp;
      reg.pc = this.readWord(addr);
      reg.sp = clamp16(addr + 2);
      this.inNmi = false;
      this.completeNmi();
    });
  }

  raiseInterrupt(data) {
    if (this.registers.iff1 === 0) { return; }

    this.hasPendingInterrupt = true;
    this.pendingInterruptData = data;
  }

  calculateOffsetAddress() {
    const ind = this.indexRegister;
    const offset_raw = this.readFromPcAdvance();
    const offset = offset_raw < 0x80 ? offset_raw : -(0x100 - offset_raw);
    const addr = this[ind];
    return clamp16(addr + offset);
  }

  calculateBitOffsetAddress() {
    const ind = this.indexRegister;
    const offset_raw = this.byteOffset;
    const offset = offset_raw < 0x80 ? offset_raw : -(0x100 - offset_raw);
    const addr = this[ind];
    return clamp16(addr + offset);
  }

  overridePC(data) {
    if (! Array.isArray(data)) {
      data = [ data ];
    }

    this.overriddenPcData = data;
    this.overriddenPcOffset = 0;
    this.overriddenPcCountdown = 1;
  }

  restorePcOverride() {
    if (this.overriddenPcCountdown === 0) {
      this.overriddenPcData = null;
      this.overriddenPcOffset = 0;
    } else {
      --this.overriddenPcCountdown;
    }
  }

  clearIndexStates() {
    this.indexRegister = null;
    this.byteOffset = 0;
  }

  handleInterruptMode0() {
    const data = this.pendingInterruptData;
    this.setNextCommand(2, () => {
      this.overridePC(data);
    });
  }

  handleInterruptMode1() {
    this.setNextCommand(2, () => {
      const reg = this.registers;
      const addr = clamp16(reg.sp - 2);
      this.writeWord(addr, reg.pc);
      reg.sp = addr;
      reg.pc = 0x0038;
    });
  }

  interruptDataAsByte() {
    if (Array.isArray(this.pendingInterruptData)) {
      return this.pendingInterruptData[0];
    }

    return this.pendingInterruptData;
  }

  handleInterruptMode2() {
    this.setNextCommand(19, () => {
      const reg = this.registers;
      const byte = this.interruptDataAsByte();
      const addr = clamp16((reg.i << 8) | byte);
      const newLoc = this.readWord(addr);
      const newSp = clamp16(reg.sp - 2);
      this.writeWord(newSp, reg.pc);
      reg.sp = newSp;
      reg.pc = newLoc;
    });
  }

  handleInterrupt() {
    this.interruptHandler();
    this.halted = false;
    this.hasPendingInterrupt = false;
    this.pendingInterruptData = null;
  }

  completeInterrupt() {
    this.bus.completeInterrupt();
  }

  reti() {
    this.setNextCommand(14, () => {
      this.advancePC();
      const reg = this.registers;
      const addr = reg.sp;
      reg.pc = this.readWord(addr);
      reg.sp = clamp16(addr + 2);
      this.completeInterrupt();
    });
  }

  handleHalt() {
    if (this.halted) {
      this.reversePC();
    }
  }

  handleInterrupts() {
    if (this.hasPendingNmi) {
      this.handleNmi();
      return true;
    } else if (this.hasPendingInterrupt) {
      this.handleInterrupt();
      return true;
    }

    return false;
  }

  decodeInstruction() {
    // continue with handling the current instruction
    const inst = this.readFromPc();

    const fn = this.inst[inst];
    if (! fn) {
      const instStr = inst.toString(16);
      throw new Z80Error(`inst [${instStr}] has no registered callback`);
    }

    fn.call(this);

    if (this.tStatesEnabled) {
      if (!this.pendingCommand || this.pendingCommand.isReady()) {
        const instStr = inst.toString(16);
        throw new Z80Error(`inst [${instStr}] invoked without setting t states`);
      }
    }
  }

  handlePendingCommand() {
    if (!this.pendingCommand) { return false; }

    const command = this.pendingCommand;
    this.pendingCommand = null;

    command.apply();

    this.restorePcOverride();

    // resets index settings (ix/iy and offset)
    this.clearIndexStates();

    return true;
  }

  inPendingCommand() {
    if (this.pendingCommand && this.tStatesEnabled) {
      if (!this.pendingCommand.isReady()) {
        this.pendingCommand.tick();
        return !this.pendingCommand.isReady();
      }
    }

    return false;
  }

  clock() {
    // consume any t states remaining from the previous instruction
    if (this.inPendingCommand()) { return; }
    if (this.handlePendingCommand()) { return; }

    // we have completed the previous instruction

    // check whether we need to handle an interrupt here
    if (this.handleInterrupts()) { return; }

    // check whether we are ready to enable inturrupts
    this.checkEnableInterrupts();

    this.handleHalt();

    this.decodeInstruction();
  }

  readWord(addr) {
    const lo = this.readByte(addr);
    const hi = this.readByte(addr + 1);
    return makeWord({ hi, lo });
  }

  writeWord(addr, word) {
    word = clamp16(word);
    const hi = clamp8(word >> 8);
    const lo = clamp8(word);
    this.writeByte(addr, lo);
    this.writeByte(addr + 1, hi);
  }

  readByte(addr) {
    addr %= 0x10000;
    return clamp8(this.bus.readOne(addr));
  }

  readPort(port, high) {
    port = clamp8(port);
    return clamp8(this.bus.readPort(port, high));
  }

  writeByte(addr, byte) {
    addr = clamp16(addr);
    this.bus.writeOne(addr, clamp8(byte));
  }

  writePort(port, high, byte) {
    port = clamp8(port);
    this.bus.writePort(port, high, clamp8(byte));
  }

  readFromPc(offset = 0) {
    if (this.overriddenPcData) {
      return this.overriddenPcData[this.overriddenPcOffset + offset];
    }

    return this.readByte(clamp16(this.registers.pc + offset));
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
    if (this.overriddenPcData) {
      this.overriddenPcOffset += count;
      return;
    }

    this.registers.pc = clamp16(this.registers.pc + count);
  }

  reversePC(count = 1) {
    if (this.overriddenPcData) {
      this.overriddenPcOffset -= count;
      return;
    }

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

  setNextCommand(tStates, command) {
    this.pendingCommand = new Z80Command(tStates - 1, command)
  }

  nop() {
    this.setNextCommand(4, ()=>{
      this.advancePC();
    });
  }

  halt() {
    this.setNextCommand(4, ()=>{
      this.halted = true;
      this.advancePC();
    });
  }

  ld_16_imm() {
    this.advancePC();
    return this.readWordPartsFromPcAdvance();
  }

  ld_bc_imm() {
    this.setNextCommand(10, ()=>{
      const { lo, hi } = this.ld_16_imm()

      this.registers.c = lo;
      this.registers.b = hi;
    });
  }

  ld_hl_imm() {
    this.setNextCommand(10, ()=>{
      const { lo, hi } = this.ld_16_imm()

      this.registers.l = lo;
      this.registers.h = hi;
    });
  }

  ld_de_imm() {
    this.setNextCommand(10, ()=>{
      const { lo, hi } = this.ld_16_imm()

      this.registers.e = lo;
      this.registers.d = hi;
    });
  }

  ld_sp_imm() {
    this.setNextCommand(10, ()=>{
      const bytes = this.ld_16_imm()
      this.registers.sp = makeWord(bytes);
    });
  }

  ld_sp_hl() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.registers.sp = this.hl;
    });
  }

  ld_hl_ptr_imm() {
    this.setNextCommand(20, () => {
      this.advancePC();
      const addr = this.readWordFromPcAdvance();
      const word  = this.readWord(addr);
      this.hl = word;
    });
  }

  ld_ptr_16_a(addr) {
    const a = this.registers.a;
    this.writeByte(addr, a);
  }

  ld_ptr_bc_a() {
    this.setNextCommand(7, () => {
      this.advancePC();
      this.ld_ptr_16_a(this.bc);
    });
  }

  ld_ptr_de_a() {
    this.setNextCommand(7, () => {
      this.advancePC();
      this.ld_ptr_16_a(this.de);
    });
  }

  ld_ptr_hl_imm() {
    this.setNextCommand(10, () => {
      const addr = this.hl;
      this.advancePC();
      const value = this.readFromPcAdvance();

      this.writeByte(addr, value);
    });
  }

  ld_ptr_imm_a() {
    this.setNextCommand(13, () => {
      this.advancePC();
      const addr = this.readWordFromPcAdvance();

      this.writeByte(addr, this.registers.a);
      });
  }

  ld_ptr_imm_hl() {
    this.setNextCommand(20, () => {
      this.advancePC();
      const addr = this.readWordFromPcAdvance();
      this.writeWord(addr, this.hl);
    });
  }

  inc_16(value) {
    const { a } = add16(value, 1);

    return a;
  }

  inc_bc() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.bc = this.inc_16(this.bc);
    });
  }

  inc_de() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.de = this.inc_16(this.de);
    });
  }

  inc_hl() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.hl = this.inc_16(this.hl);
    });
  }

  inc_sp() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.registers.sp = this.inc_16(this.registers.sp);
    });
  }

  dec_16(value) {
    const { a } = sub16(value, 1);

    return a;
  }

  dec_bc() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.bc = this.dec_16(this.bc);
    });
  }

  dec_de() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.de = this.dec_16(this.de);
    });
  }

  dec_hl() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.hl = this.dec_16(this.hl);
    });
  }

  dec_sp() {
    this.setNextCommand(6, () => {
      this.advancePC();
      this.registers.sp = this.dec_16(this.registers.sp);
    });
  }

  inc_08(value) {
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
      this.setNextCommand(4, () => {
        this.advancePC();
        this.registers[dst] = this.inc_08(this.registers[dst]);
      });
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
    const value = this.readByte(addr);
    const after = this.inc_08(value);
    this.writeByte(addr, after);
    this.setT(11);
  }

  dec_08(value) {
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
      this.setNextCommand(4, () => {
        this.advancePC();
        this.registers[dst] = this.dec_08(this.registers[dst]);
      });
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
    const value = this.readByte(addr);
    const after = this.dec_08(value);
    this.writeByte(addr, after);
    this.setT(11);
  }

  make_ld_r8_imm(dst) {
    return () => {
      this.setNextCommand(7, () => {
        this.advancePC();
        this.registers[dst] = this.readFromPcAdvance();
      });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      const { a, c } = this.rlXa();
      this.registers.a = a | c;
    });
  }

  rla() {
    this.setNextCommand(4, () => {
      this.advancePC();
      const { a } = this.rlXa();
      this.registers.a = a;
    });
  }

  rrXa() {
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
    this.setNextCommand(4, () => {
      this.advancePC();
      const { a, c } = this.rrXa();
      this.registers.a = a | (c << 7);;
    });
  }

  rra() {
    this.setNextCommand(4, () => {
      this.advancePC();
      const { a } = this.rrXa();
      this.registers.a = a;
    });
  }

  shadowPairs(regs) {
    return regs.map(r => ([r, `${r}$`]));
  }

  ex_ptr_sp_hl() {
    this.setNextCommand(19, () => {
      this.advancePC();
      const sp = this.registers.sp;
      const spWord = this.readWord(sp);
      const hl = this.hl;
      this.writeWord(sp, hl);
      this.hl = spWord;
    });
  }

  ex_r8_list(pairs) {
    const reg = this.registers;
    for (let [a, b] of pairs) {
      [reg[a], reg[b]] = [reg[b], reg[a]];
    }
  }

  ex_af() {
    this.setNextCommand(4, () => {
      const regs = ['a', 'f'];
      this.advancePC();
      this.ex_r8_list(this.shadowPairs(regs));
    });
  }

  ex_de_hl() {
    this.setNextCommand(4, () => {
      const pairs = [['d', 'h'], ['e', 'l']];
      this.advancePC();
      this.ex_r8_list(pairs);
    });
  }

  exx() {
    this.setNextCommand(4, () => {
      const regs = ['b', 'c', 'd', 'e', 'h', 'l'];
      this.advancePC();
      this.ex_r8_list(this.shadowPairs(regs));
    });
  }

  add_hl_16(value) {
    const { a, h, n, c } = add16(this.hl, value);
    this.hl = a;

    const f = this.getFlags();
    f.n = n;
    f.c = c;
    f.h = h;
    this.setFlags(f);
  }

  add_hl_bc() {
    this.setNextCommand(11, () => {
      this.advancePC();
      this.add_hl_16(this.bc);
    });
  }

  add_hl_de() {
    this.setNextCommand(11, () => {
      this.advancePC();
      this.add_hl_16(this.de);
    });
  }

  add_hl_hl() {
    this.setNextCommand(11, () => {
      this.advancePC();
      this.add_hl_16(this.hl);
    });
  }

  add_hl_sp() {
    this.setNextCommand(11, () => {
      this.advancePC();
      this.add_hl_16(this.registers.sp);
    });
  }

  ld_a_ptr_16(addr) {
    const a = this.readByte(addr);
    this.registers.a = a;
  }

  ld_a_ptr_bc() {
    this.setNextCommand(7, () => {
      this.advancePC();
      this.ld_a_ptr_16(this.bc);
    });
  }

  ld_a_ptr_de() {
    this.setNextCommand(7, () => {
      this.advancePC();
      this.ld_a_ptr_16(this.de);
    });
  }

  ld_a_ptr_imm() {
    this.setNextCommand(13, () => {
      this.advancePC();
      const addr = this.readWordFromPcAdvance();
      this.ld_a_ptr_16(addr);
    });
  }

  jr_08() {
    this.advancePC();
    const offset = signed8(this.readFromPcAdvance());
    this.registers.pc += offset;
  }

  djnz_imm() {
    const b = this.registers.b - 1;

    if (b) {
      this.setNextCommand(13, () => {
        this.jr_08();
        this.registers.b = b;
      });
    } else {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        this.registers.b = b;
      });
    }
  }

  jr_imm() {
    this.setNextCommand(12, () => {
      this.jr_08();
    });
  }

  jr_cond_imm(condFn) {
    if (condFn()) {
      this.setNextCommand(12, () => {
        this.jr_08();
      });
    } else {
      this.setNextCommand(7, () => {
        this.advancePC(2);
      });
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
    this.setNextCommand(4, () => {
      this.advancePC();

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
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.add_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.add_08(value);
    });
  }

  add_a_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.add_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.adc_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.adc_08(value);
    });
  }

  adc_a_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.adc_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.sub_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.sub_08(value);
    });
  }

  sub_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.sub_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.sbc_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.sbc_08(value);
    });
  }

  sbc_a_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.sbc_08(value);
    });
  }

  cpl() {
    this.setNextCommand(4, () => {
      this.advancePC();
      const a = clamp8(~this.registers.a);
      this.registers.a = a;

      const f = this.getFlags();
      f.h = 1;
      f.n = 1;
      this.setFlags(f);
    });
  }

  scf() {
    this.setNextCommand(4, () => {
      this.advancePC();
      const f = { ...this.getFlags(), c:1, h:0, n:0 };
      this.setFlags(f);
    });
  }

  ccf() {
    this.setNextCommand(4, () => {
      this.advancePC();
      const f = { ...this.getFlags(), n:0 };
      f.h = f.c;
      f.c = toBit(! f.c);
      this.setFlags(f);
    });
  }

  make_ld_r8_r8(dst, src) {
    return () => {
      this.setNextCommand(4, () => {
        this.advancePC();
        this.registers[dst] = this.registers[src];
      });
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
      this.setNextCommand(7, () => {
        this.advancePC();
        const value = this.readByte(this.hl);
        this.registers[dst] = value;
      });
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
      this.setNextCommand(7, () => {
        this.advancePC();
        const value = this.registers[src];
        this.writeByte(this.hl, value);
      });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.and_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.and_08(value);
    });
  }

  and_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.and_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.or_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.or_08(value);
    });
  }

  or_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.or_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.xor_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.xor_08(value);
    });
  }

  xor_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.xor_08(value);
    });
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
    this.setNextCommand(4, () => {
      this.advancePC();
      this.cp_08(value);
    });
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
    this.setNextCommand(7, () => {
      this.advancePC();
      const addr = this.hl;
      const value = this.readByte(addr);
      this.cp_08(value);
    });
  }

  cp_imm() {
    this.setNextCommand(7, () => {
      this.advancePC();
      const value = this.readFromPcAdvance();
      this.cp_08(value);
    });
  }

  make_call_cond_imm(condFn) {
    return () => {
      if (condFn()) {
        this.setNextCommand(17, () => {
          this.advancePC();
          const newPc = this.readWordFromPcAdvance();
          this.call_imm_internal(newPc);
        });
      } else {
        this.setNextCommand(10, () => {
          this.advancePC();
        });
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
        this.setNextCommand(11, () => {
          this.advancePC();
          this.ret_internal();
        });
      } else {
        this.setNextCommand(5, () => {
          this.advancePC();
        });
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
    this.setNextCommand(17, () => {
      this.advancePC();
      const newPc = this.readWordFromPcAdvance();
      this.call_imm_internal(newPc);
    });
  }

  call_imm_internal(pc) {
    const sp = clamp16(this.registers.sp - 2);
    this.writeWord(sp, this.registers.pc);
    this.registers.sp = sp;
    this.registers.pc = pc;
  }

  ret() {
    this.setNextCommand(10, () => {
      this.advancePC();
      this.ret_internal();
    });
  }

  ret_internal() {
    const sp = this.registers.sp
    const newPc = this.readWord(sp);
    this.registers.sp = clamp16(sp + 2);
    this.registers.pc = newPc;
  }

  jp_ptr_hl() {
    this.setNextCommand(4, () => {
      this.advancePC();
      this.registers.pc = this.hl;
    });
  }

  jp_imm_internal(pc) {
    this.registers.pc = pc;
  }

  jp_imm() {
    this.setNextCommand(10, () => {
      this.advancePC();
      const newPc = this.readWordFromPcAdvance();
      this.jp_imm_internal(newPc);
    });
  }

  make_jp_cond_imm(condFn) {
    return () => {
      if (condFn()) {
        this.setNextCommand(10, () => {
          this.advancePC();
          const newPc = this.readWordFromPcAdvance();
          this.jp_imm_internal(newPc);
        });
      } else {
        this.setNextCommand(10, () => {
          this.advancePC(3);
        });
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
      this.setNextCommand(11, () => {
        this.advancePC();
        const sp = clamp16(this.registers.sp - 2);
        this.writeWord(sp, getter());
        this.registers.sp = sp;
      });
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
      this.setNextCommand(10, () => {
        this.advancePC();
        const sp = this.registers.sp;
        const value = this.readWord(sp);
        this.registers.sp = clamp16(sp + 2);
        setter(value);
      });
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
      this.setNextCommand(11, () => {
        this.advancePC();
        const sp = clamp16(this.registers.sp - 2);
        this.writeWord(sp, this.registers.pc);
        this.registers.sp = sp;
        this.registers.pc = offset;
      });
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

  di() {
    this.setNextCommand(4, () => {
      this.advancePC();
      this.interruptsEnabled = false;
      this.registers.iff1 = 0;
      this.registers.iff2 = 0;
    });
  }

  ei() {
    this.setNextCommand(4, () => {
      this.advancePC();
      this.interruptsEnabled = true;
      this.eiCountdown = 1;
    });
  }

  out_ptr_imm_a() {
    this.setNextCommand(11, () => {
      this.advancePC();
      const port = this.readFromPcAdvance();
      const a = this.registers.a;
      this.writePort(port, a, a);
    });
  }

  in_a_ptr_imm() {
    this.setNextCommand(11, () => {
      this.advancePC();
      const port = this.readFromPcAdvance();
      this.registers.a = this.readPort(port, this.registers.a);
    });
  }

  pre_80() {
    const inst = this.readFromPc(1);

    const fn = this.ext[inst];
    if (! fn) {
      // treat the prefix as a nop
      this.setNextCommand(4, () => {
        this.advancePC();
      });
    } else {
      // invoke
      fn.call(this);
    }
  }

  pre_bit() {
    const inst = this.readFromPc(1);

    const fn = this.bit[inst];
    if (! fn) {
      // treat the prefix as a nop
      this.setNextCommand(4, () => {
        this.advancePC();
      });
    } else {
      // invoke
      fn.call(this);
    }
  }

  pre_ix() {
    const inst = this.readFromPc(1);

    const fn = this.index[inst];
    if (! fn) {
      // treat the prefix as a nop
      this.setNextCommand(4, () => {
        this.advancePC();
      });
    } else {
      // invoke
      this.indexRegister = 'ix';
      fn.call(this);
    }
  }

  pre_iy() {
    const inst = this.readFromPc(1);

    const fn = this.index[inst];
    if (! fn) {
      // treat the prefix as a nop
      this.setNextCommand(4, () => {
        this.advancePC();
      });
    } else {
      // invoke
      this.indexRegister = 'iy';
      fn.call(this);
    }
  }

  registerInstructions() {
    this.registerBasic();
    this.registerExtended();
    this.registerBit();
    this.registerIndex();
    this.registerIndexBit();
  }

  registerBasic() {
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
    ref[inst.pre_bit] = this.pre_bit;
    ref[inst.call_imm] = this.call_imm;
    ref[inst.adc_a_imm] = this.adc_a_imm;

    ref[inst.out_ptr_imm_a] = this.out_ptr_imm_a;
    ref[inst.sub_imm] = this.sub_imm;

    ref[inst.exx] = this.exx;
    ref[inst.in_a_ptr_imm] = this.in_a_ptr_imm;
    ref[inst.pre_ix] = this.pre_ix;
    ref[inst.sbc_a_imm] = this.sbc_a_imm;

    ref[inst.ex_ptr_sp_hl] = this.ex_ptr_sp_hl;
    ref[inst.and_imm] = this.and_imm;

    ref[inst.jp_ptr_hl] = this.jp_ptr_hl;
    ref[inst.ex_de_hl] = this.ex_de_hl;
    ref[inst.pre_80] = this.pre_80;
    ref[inst.xor_imm] = this.xor_imm;

    ref[inst.di] = this.di;
    ref[inst.or_imm] = this.or_imm;

    ref[inst.ld_sp_hl] = this.ld_sp_hl;
    ref[inst.ei] = this.ei;
    ref[inst.pre_iy] = this.pre_iy;
    ref[inst.cp_imm] = this.cp_imm;

    // gen.generate('ld bc imm');
    // (\b) (\b)
    // $1_$2
    // g.*'([^']*)'.*
    // ref[inst.$1] = this.$1;
  }

  make_in_r8_ptr_c(reg) {
    return () => {
      this.setNextCommand(12, () => {
        this.advancePC(2);
        const port = this.registers.c;
        this.registers[reg] = this.readPort(port, this.registers.b);
      });
    };
  }

  register_in_r8_ptr_c(ref) {
    const regs = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l'];
    for (let reg of regs) {
      const inst = `in_${reg}_ptr_c`;
      ref[ext[inst]] = this.make_in_r8_ptr_c(reg);
    }
  }

  make_out_ptr_c_r8(reg) {
    return () => {
      this.setNextCommand(12, () => {
        this.advancePC(2);
        const port = this.registers.c;
        this.writePort(port, this.registers.b, this.registers[reg]);
      });
    };
  }

  register_out_ptr_c_r8(ref) {
    const regs = ['a', 'f', 'b', 'c', 'd', 'e', 'h', 'l'];
    for (let reg of regs) {
      const inst = `out_ptr_c_${reg}`;
      ref[ext[inst]] = this.make_out_ptr_c_r8(reg);
    }
  }

  make_ld_ptr_imm_r16(reg) {
    return () => {
      this.setNextCommand(20, () => {
        this.advancePC(2);
        const value = this[reg];
        const addr = this.readWordFromPcAdvance();
        this.writeWord(addr, value);
      });
    };
  }

  register_ld_ptr_imm_r16(ref) {
    const regs = ['bc', 'de', 'hl', 'sp'];
    for (let r of regs) {
      const inst = `ld_ptr_imm_${r}`;
      ref[ext[inst]] = this.make_ld_ptr_imm_r16(r);
    }
  }

  make_ld_r16_ptr_imm(reg) {
    return () => {
      this.setNextCommand(20, () => {
        this.advancePC(2);
        const addr = this.readWordFromPcAdvance();
        const value = this.readWord(addr);
        this[reg] = value;
      });
    };
  }

  register_ld_r16_ptr_imm(ref) {
    const regs = ['bc', 'de', 'hl', 'sp'];
    for (let r of regs) {
      const inst = `ld_${r}_ptr_imm`;
      ref[ext[inst]] = this.make_ld_r16_ptr_imm(r);
    }
  }

  make_sbc_hl_r16(reg) {
    return () => {
      this.setNextCommand(15, () => {
        this.advancePC(2);
        const hl = this.hl;
        const { c } = this.getFlags();
        const result = sbc16(hl, this[reg], c);
        result.p_v = result.v;
        this.setFlags(result);
        this.hl = result.a;
      });
    };
  }

  register_sbc_hl_r16(ref) {
    const regs = ['bc', 'de', 'hl', 'sp'];
    for (let r of regs) {
      const inst = `sbc_hl_${r}`;
      ref[ext[inst]] = this.make_sbc_hl_r16(r);
    }
  }

  make_adc_hl_r16(reg) {
    return () => {
      this.setNextCommand(15, () => {
        this.advancePC(2);
        const hl = this.hl;
        const { c } = this.getFlags();
        const result = adc16(hl, this[reg], c);
        result.p_v = result.v;
        this.setFlags(result);
        this.hl = result.a;
      });
    };
  }

  register_adc_hl_r16(ref) {
    const regs = ['bc', 'de', 'hl', 'sp'];
    for (let r of regs) {
      const inst = `adc_hl_${r}`;
      ref[ext[inst]] = this.make_adc_hl_r16(r);
    }
  }

  neg() {
    this.setNextCommand(8, () => {
      this.advancePC(2);
      const result = sub8(0, this.registers.a)
      this.registers.a = result.a;
      result.p_v = result.v;
      this.setFlags(result);
    });
  }

  ld_i_a() {
    this.setNextCommand(9, () => {
      this.advancePC(2);
      this.registers.i = this.registers.a;
    });
  }

  ld_a_ri(reg) {
    this.setNextCommand(9, () => {
      this.advancePC(2);
      const value = this.registers[reg];
      this.registers.a = value;
      const f = {
        ...this.getFlags(),
        s: toBit(value & 0x080),
        z: toBit(value === 0),
        h: 0,
        p_v: toBit(this.registers.iff2),
        n: 0,
      };
      this.setFlags(f);
    });
  }

  ld_a_i() {
    this.ld_a_ri('i');
  }

  ld_r_a() {
    this.setNextCommand(9, () => {
      this.advancePC(2);
      this.registers.r = this.registers.a;
    });
  }

  ld_a_r() {
    this.ld_a_ri('r');
  }

  rotate12(rotateFn) {
    this.setNextCommand(18, () => {
      this.advancePC(2);
      const a = this.registers.a;
      const addr = this.hl;
      const value = this.readByte(addr);

      const ah = (a & 0x0f0) >> 4;
      const al = a & 0x0f;
      const vh = (value & 0x0f0) >> 4;
      const vl = value & 0x0f;

      const { a: rotA, v: rotV } = rotateFn(ah, al, vh, vl);

      this.registers.a = rotA;
      this.writeByte(addr, rotV);

      const f = {
        ...this.getFlags(),
        s: toBit(rotA & 0x080),
        z: toBit(rotA === 0),
        h: 0,
        p_v: parity8(rotA),
        n: 0,
      };
      this.setFlags(f);
    });
  }

  rld() {
    this.rotate12((ah, al, vh, vl) => ({
      a: (ah << 4) | vh,
      v: (vl << 4) | al
    }));
  }

  rrd() {
    this.rotate12((ah, al, vh, vl) => ({
      a: (ah << 4) | vl,
      v: (al << 4) | vh
    }));
  }

  ld_id_r(memOp, repeat = false) {
    const count = clamp16(this.bc - 1);
    const shared = () => {
      const src = this.hl;
      const dst = this.de;
      const byte = this.readByte(src);
      this.writeByte(dst, byte);
      this.hl = clamp16(memOp(src));
      this.de = clamp16(memOp(dst));
      this.bc = count;

      const f = {
        ...this.getFlags(),
        h: 0,
        p_v: toBit(count),
        n: 0,
      };
      this.setFlags(f);
    }

    if (repeat && count !== 0) {
      this.setNextCommand(21, () => {
        shared();
      });
    } else {
      this.setNextCommand(16, () => {
        this.advancePC(2);
        shared();
      });
    }
  }

  ldi() {
    this.ld_id_r(incVal);
  }

  ldir() {
    this.ld_id_r(incVal, true);
  }

  ldd() {
    this.ld_id_r(decVal);
  }

  lddr() {
    this.ld_id_r(decVal, true);
  }

  cp_id_r(memOp, repeat = false) {
    const src = this.hl;
    const a = this.registers.a;
    const byte = this.readByte(src);
    const count = clamp16(this.bc - 1);
    const r = sub8(a, byte)

    const f = {
      ...this.getFlags(),
      s: r.s,
      z: r.z,
      h: r.h,
      p_v: toBit(count),
      n: r.n
    };

    const shared = () => {
      this.hl = clamp16(memOp(src));
      this.bc = count;
      this.setFlags(f);
    };

    if (repeat && count !== 0 && ! r.z) {
      this.setNextCommand(21, shared);
    } else {
      this.setNextCommand(16, () => {
        this.advancePC(2);
        shared();
      });
    }
  }

  cpi() {
    this.cp_id_r(incVal);
  }

  cpir() {
    this.cp_id_r(incVal, true);
  }

  cpd() {
    this.cp_id_r(decVal);
  }

  cpdr() {
    this.cp_id_r(decVal, true);
  }

  in_id_r(memOp, repeat = false) {
    const port = this.registers.c;
    const high = this.registers.b;
    const count = clamp8(high - 1);
    const addr = this.hl;

    const shared = () => {
      const byte = this.readPort(port, high);
      this.writeByte(addr, byte);
      this.hl = clamp16(memOp(addr));
      this.registers.b = count;

      const f = {
        ...this.getFlags(),
        z: toBit(count === 0),
        n: 1,
      };
      this.setFlags(f);
    };

    if (repeat && count !== 0) {
      this.setNextCommand(21, shared);
    } else {
      this.setNextCommand(16, () => {
        this.advancePC(2);
        shared();
      });
    }
  }

  ini() {
    this.in_id_r(incVal);
  }

  inir() {
    this.in_id_r(incVal, true);
  }

  ind() {
    this.in_id_r(decVal);
  }

  indr() {
    this.in_id_r(decVal, true);
  }

  out_id_r(memOp, repeat = false) {
    const addr = this.hl;
    const byte = this.readByte(addr);
    const port = this.registers.c;
    const high = this.registers.b;
    const count = clamp8(high - 1);

    const shared = () => {
      this.writePort(port, high, byte);
      this.hl = clamp16(memOp(addr));
      this.registers.b = count;

      const f = {
        ...this.getFlags(),
        z: toBit(count === 0),
        n: 1,
      };
      this.setFlags(f);
    };

    if (repeat && count !== 0) {
      this.setNextCommand(21, shared);
    } else {
      this.setNextCommand(16, () => {
        this.advancePC(2);
        shared();
      });
    }
  }

  outi() {
    this.out_id_r(incVal);
  }

  otir() {
    this.out_id_r(incVal, true);
  }

  outd() {
    this.out_id_r(decVal);
  }

  otdr() {
    this.out_id_r(decVal, true);
  }

  im_0() {
    this.setNextCommand(8, () => {
      this.advancePC();
      this.intMode = Z80Cpu.INT_MODE_0;
      this.interruptHandler = this.handleInterruptMode0;
    });
  }

  im_1() {
    this.setNextCommand(8, () => {
      this.advancePC();
      this.intMode = Z80Cpu.INT_MODE_1;
      this.interruptHandler = this.handleInterruptMode1;
    });
  }

  im_2() {
    this.setNextCommand(8, () => {
      this.advancePC();
      this.intMode = Z80Cpu.INT_MODE_2;
      this.interruptHandler = this.handleInterruptMode2;
    });
  }

  registerExtended() {
    this.ext = {};
    const ref = this.ext;

    this.register_in_r8_ptr_c(ref);
    this.register_out_ptr_c_r8(ref);
    this.register_ld_ptr_imm_r16(ref);
    this.register_ld_r16_ptr_imm(ref);
    this.register_sbc_hl_r16(ref);
    this.register_adc_hl_r16(ref);

    // 0x40
    ref[ext.neg] = this.neg;
    ref[ext.retn] = this.retn;
    ref[ext.im_0] = this.im_0;
    ref[ext.ld_i_a] = this.ld_i_a;

    ref[ext.reti] = this.reti;
    ref[ext.ld_r_a] = this.ld_r_a;

    // 0x50
    ref[ext.im_1] = this.im_1;
    ref[ext.ld_a_i] = this.ld_a_i;

    ref[ext.im_2] = this.im_2;
    ref[ext.ld_a_r] = this.ld_a_r;

    // 0x60
    ref[ext.rrd] = this.rrd;

    ref[ext.rld] = this.rld;

    // 0xa0
    ref[ext.ldi] = this.ldi;
    ref[ext.cpi] = this.cpi;
    ref[ext.ini] = this.ini;
    ref[ext.outi] = this.outi;

    ref[ext.ldd] = this.ldd;
    ref[ext.cpd] = this.cpd;
    ref[ext.ind] = this.ind;
    ref[ext.outd] = this.outd;

    // 0xb0
    ref[ext.ldir] = this.ldir;
    ref[ext.cpir] = this.cpir;
    ref[ext.inir] = this.inir;
    ref[ext.otir] = this.otir;

    ref[ext.lddr] = this.lddr;
    ref[ext.cpdr] = this.cpdr;
    ref[ext.indr] = this.indr;
    ref[ext.otdr] = this.otdr;
  }

  make_rlc_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const value = this.registers[reg];
        const result = rlc8(value);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...this.getFlags(),
          ...result
        });
      });
    };
  }

  register_rlc_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`rlc_${reg}`]] = this.make_rlc_r8(reg);
    }
  }

  rlc_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = rlc8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...this.getFlags(),
        ...result
      });
    });
  }

  make_rrc_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const value = this.registers[reg];
        const result = rrc8(value);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...this.getFlags(),
          ...result
        });
      });
    };
  }

  register_rrc_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`rrc_${reg}`]] = this.make_rrc_r8(reg);
    }
  }

  rrc_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = rrc8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...this.getFlags(),
        ...result
      });
    });
  }

  make_rl_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const f = this.getFlags();
        const value = this.registers[reg];
        const result = rl8(value, f.c);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...f,
          ...result
        });
      });
    };
  }

  register_rl_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`rl_${reg}`]] = this.make_rl_r8(reg);
    }
  }

  rl_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const f = this.getFlags();
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = rl8(value, f.c);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  make_rr_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const f = this.getFlags();
        const value = this.registers[reg];
        const result = rr8(value, f.c);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...f,
          ...result
        });
      });
    };
  }

  register_rr_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`rr_${reg}`]] = this.make_rr_r8(reg);
    }
  }

  rr_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const f = this.getFlags();
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = rr8(value, f.c);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  make_sla_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const f = this.getFlags();
        const value = this.registers[reg];
        const result = sla8(value);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...f,
          ...result
        });
      });
    };
  }

  register_sla_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`sla_${reg}`]] = this.make_sla_r8(reg);
    }
  }

  sla_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const f = this.getFlags();
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = sla8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  make_sra_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const f = this.getFlags();
        const value = this.registers[reg];
        const result = sra8(value);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...f,
          ...result
        });
      });
    };
  }

  register_sra_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`sra_${reg}`]] = this.make_sra_r8(reg);
    }
  }

  sra_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const f = this.getFlags();
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = sra8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  make_srl_r8(reg) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const f = this.getFlags();
        const value = this.registers[reg];
        const result = srl8(value);
        this.registers[reg] = result.a;

        result.p_v = result.p;
        this.setFlags({
          ...f,
          ...result
        });
      });
    };
  }

  register_srl_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      ref[bit[`srl_${reg}`]] = this.make_srl_r8(reg);
    }
  }

  srl_ptr_hl() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const f = this.getFlags();
      const addr = this.hl;
      const value = this.readByte(addr);
      const result = srl8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  bit_08(value, bit) {
    const f = this.getFlags();
    const result = clamp8(value & makeMask(bit));

    this.setFlags({
      ...f,
      z: (result === 0),
      h: 1,
      n: 0,
    });
  }

  make_bit_r8(reg, bit) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const value = this.registers[reg];
        this.bit_08(value, bit);
      });
    };
  }

  register_bit_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      for (let b = 0; b < 8; ++b) {
        ref[bit[`bit_${b}_${reg}`]] = this.make_bit_r8(reg, b);
      }
    }
  }

  make_bit_ptr_hl(bit) {
    return () => {
      this.setNextCommand(12, () => {
        this.advancePC(2);
        const addr = this.hl;
        const value = this.readByte(addr);
        this.bit_08(value, bit);
      });
    };
  }

  register_bit_ptr_hl(ref) {
    for (let b = 0; b < 8; ++b) {
      ref[bit[`bit_${b}_ptr_hl`]] = this.make_bit_ptr_hl(b);
    }
  }

  res_08(value, bit) {
    return clamp8(value & ~makeMask(bit));
  }

  make_res_r8(reg, bit) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2);
        const value = this.registers[reg];
        const result = this.res_08(value, bit);
        this.registers[reg] = result;
      });
    };
  }

  register_res_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      for (let b = 0; b < 8; ++b) {
        ref[bit[`res_${b}_${reg}`]] = this.make_res_r8(reg, b);
      }
    }
  }

  make_res_ptr_hl(bit) {
    return () => {
      this.setNextCommand(15, () => {
        this.advancePC(2);
        const addr = this.hl;
        const value = this.readByte(addr);
        const result = this.res_08(value, bit);
        this.writeByte(addr, result);
      });
    };
  }

  register_res_ptr_hl(ref) {
    for (let b = 0; b < 8; ++b) {
      ref[bit[`res_${b}_ptr_hl`]] = this.make_res_ptr_hl(b);
    }
  }


  set_08(value, bit) {
    return clamp8(value | makeMask(bit));
  }

  make_set_r8(reg, bit) {
    return () => {
      this.setNextCommand(8, () => {
        this.advancePC(2)
        const value = this.registers[reg];
        const result = this.set_08(value, bit);
        this.registers[reg] = result;
      });
    };
  }

  register_set_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      for (let b = 0; b < 8; ++b) {
        ref[bit[`set_${b}_${reg}`]] = this.make_set_r8(reg, b);
      }
    }
  }

  make_set_ptr_hl(bit) {
    return () => {
      this.setNextCommand(15, () => {
        this.advancePC(2);
        const addr = this.hl;
        const value = this.readByte(addr);
        const result = this.set_08(value, bit);
        this.writeByte(addr, result);
      });
    };
  }

  register_set_ptr_hl(ref) {
    for (let b = 0; b < 8; ++b) {
      ref[bit[`set_${b}_ptr_hl`]] = this.make_set_ptr_hl(b);
    }
  }

  registerBit() {
    this.bit = {};
    const ref = this.bit;

    this.register_rlc_r8(ref);
    ref[bit.rlc_ptr_hl] = this.rlc_ptr_hl;
    this.register_rrc_r8(ref);
    ref[bit.rrc_ptr_hl] = this.rrc_ptr_hl;

    this.register_rl_r8(ref);
    ref[bit.rl_ptr_hl] = this.rl_ptr_hl;
    this.register_rr_r8(ref);
    ref[bit.rr_ptr_hl] = this.rr_ptr_hl;

    this.register_sla_r8(ref);
    ref[bit.sla_ptr_hl] = this.sla_ptr_hl;
    this.register_sra_r8(ref);
    ref[bit.sra_ptr_hl] = this.sra_ptr_hl;
    this.register_srl_r8(ref);
    ref[bit.srl_ptr_hl] = this.srl_ptr_hl;

    this.register_bit_r8(ref);
    this.register_bit_ptr_hl(ref);

    this.register_res_r8(ref);
    this.register_res_ptr_hl(ref);

    this.register_set_r8(ref);
    this.register_set_ptr_hl(ref);
  }

  add_ind_16(value) {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const { a, h, n, c } = add16(this[this.indexRegister], value);
      this[this.indexRegister] = a;

      const f = this.getFlags();
      f.n = n;
      f.c = c;
      f.h = h;
      this.setFlags(f);
    });
  }

  register_add_ind_16(ref) {
    const regs = ['bc', 'de', 'ind', 'sp'];
    for (let reg of regs) {
      ref[index[`add_ind_${reg}`]] = () => {
        if (reg === 'ind') {
          reg = this.indexRegister;
        }

        this.add_ind_16(this[reg]);
      };
    }
  }

  ld_ind_imm() {
    this.setNextCommand(14, () => {
      this.advancePC(2);
      const word = this.readWordFromPcAdvance();
      this[this.indexRegister] = word;
    });
  }

  ld_ptr_imm_ind() {
    this.setNextCommand(20, () => {
      this.advancePC(2);
      const addr = this.readWordFromPcAdvance();
      this.writeWord(addr, this[this.indexRegister]);
    });
  }

  inc_ind() {
    this.setNextCommand(10, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      this[ind] = this.inc_16(this[ind]);
    });
  }

  dec_ind() {
    this.setNextCommand(10, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      this[ind] = this.dec_16(this[ind]);
    });
  }

  ld_ind_ptr_imm() {
    this.setNextCommand(20, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      const addr = this.readWordFromPcAdvance();
      const word  = this.readWord(addr);
      this[ind] = word;
    });
  }

  inc_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      const after = this.inc_08(value);
      this.writeByte(offset_addr, after);
    });
  }

  dec_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      const after = this.dec_08(value);
      this.writeByte(offset_addr, after);
    });
  }

  ld_ptr_ind_imm() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readFromPcAdvance();

      this.writeByte(offset_addr, value);
    });
  }

  make_ld_r8_ptr_ind(reg) {
    return () => {
      this.setNextCommand(19, () => {
        this.advancePC(2);
        const offset_addr = this.calculateOffsetAddress()
        const value = this.readByte(offset_addr);
        this.registers[reg] = value;
      });
    };
  }

  register_ld_r8_ptr_ind(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      const inst = `ld_${reg}_ptr_ind`;
      ref[index[inst]] = this.make_ld_r8_ptr_ind(reg);
    }
  }

  make_ld_ptr_ind_r8(reg) {
    return () => {
      this.setNextCommand(19, () => {
        this.advancePC(2);
        const offset_addr = this.calculateOffsetAddress()
        const value = this.registers[reg];
        this.writeByte(offset_addr, value);
      });
    };
  }

  register_ld_ptr_ind_r8(ref) {
    const regs = [ 'a', 'b', 'c', 'd', 'e', 'h', 'l' ];
    for (let reg of regs) {
      const inst = `ld_ptr_ind_${reg}`;
      ref[index[inst]] = this.make_ld_ptr_ind_r8(reg);
    }
  }

  add_a_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.add_08(value);
    });
  }

  adc_a_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.adc_08(value);
    });
  }

  sub_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.sub_08(value);
    });
  }

  sbc_a_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.sbc_08(value);
    });
  }

  and_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.and_08(value);
    });
  }

  xor_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.xor_08(value);
    });
  }

  or_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.or_08(value);
    });
  }

  cp_ptr_ind() {
    this.setNextCommand(19, () => {
      this.advancePC(2);
      const offset_addr = this.calculateOffsetAddress()
      const value = this.readByte(offset_addr);
      this.cp_08(value);
    });
  }

  pop_ind() {
    this.setNextCommand(14, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      const sp = this.registers.sp;
      const value = this.readWord(sp);
      this.registers.sp = clamp16(sp + 2)
      this[ind] = value;
    });
  }

  push_ind() {
    this.setNextCommand(15, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      const sp = clamp16(this.registers.sp - 2);
      this.registers.sp = sp;
      const value = this[ind];
      this.writeWord(sp, value);
    });
  }

  ex_ptr_sp_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      const sp = this.registers.sp;
      const spWord = this.readWord(sp);
      const indWord = this[ind];
      this.writeWord(sp, indWord);
      this[ind] = spWord;
    });
  }

  ld_sp_ind() {
    this.setNextCommand(10, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      this.registers.sp = this[ind];
    });
  }

  jp_ptr_ind() {
    this.setNextCommand(8, () => {
      this.advancePC(2);
      const ind = this.indexRegister;
      this.registers.pc = this[ind];
    });
  }

  ind_pre_bit() {
    const byte = this.readFromPc(2);
    const inst = this.readFromPc(3);

    const fn = this.index_bit[inst];
    if (! fn) {
      // treat the prefix as a nop
      this.setNextCommand(4, () => {
        this.advancePC();
      });
    } else {
      // invoke
      this.byteOffset = byte;
      fn.call(this);
    }
  }

  registerIndex() {
    this.index = {};
    const ref = this.index;

    ref[index.ld_ind_imm] = this.ld_ind_imm;
    this.register_add_ind_16(ref);

    ref[index.ld_ptr_imm_ind] = this.ld_ptr_imm_ind;
    ref[index.inc_ind] = this.inc_ind;
    ref[index.dec_ind] = this.dec_ind;
    ref[index.ld_ind_ptr_imm] = this.ld_ind_ptr_imm;
    ref[index.inc_ptr_ind] = this.inc_ptr_ind;
    ref[index.dec_ptr_ind] = this.dec_ptr_ind;
    ref[index.ld_ptr_ind_imm] = this.ld_ptr_ind_imm;

    this.register_ld_r8_ptr_ind(ref);
    this.register_ld_ptr_ind_r8(ref);

    ref[index.add_a_ptr_ind] = this.add_a_ptr_ind;
    ref[index.adc_a_ptr_ind] = this.adc_a_ptr_ind;
    ref[index.sub_ptr_ind] = this.sub_ptr_ind;
    ref[index.sbc_a_ptr_ind] = this.sbc_a_ptr_ind;
    ref[index.and_ptr_ind] = this.and_ptr_ind;
    ref[index.xor_ptr_ind] = this.xor_ptr_ind;
    ref[index.or_ptr_ind] = this.or_ptr_ind;
    ref[index.cp_ptr_ind] = this.cp_ptr_ind;

    ref[index.pop_ind] = this.pop_ind;
    ref[index.push_ind] = this.push_ind;

    ref[index.ex_ptr_sp_ind] = this.ex_ptr_sp_ind;
    ref[index.ld_sp_ind] = this.ld_sp_ind;

    ref[index.jp_ptr_ind] = this.jp_ptr_ind;

    ref[inst.pre_bit] = this.ind_pre_bit;
  }

  rlc_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = rlc8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...this.getFlags(),
        ...result
      });
    });
  }

  rrc_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = rrc8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...this.getFlags(),
        ...result
      });
    });
  }

  rl_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const f = this.getFlags();
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = rl8(value, f.c);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  rr_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const f = this.getFlags();
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = rr8(value, f.c);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  sla_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const f = this.getFlags();
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = sla8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  sra_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const f = this.getFlags();
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = sra8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  srl_ptr_ind() {
    this.setNextCommand(23, () => {
      this.advancePC(4);
      const f = this.getFlags();
      const addr = this.calculateBitOffsetAddress();
      const value = this.readByte(addr);
      const result = srl8(value);
      this.writeByte(addr, result.a);

      result.p_v = result.p;
      this.setFlags({
        ...f,
        ...result
      });
    });
  }

  register_bit_b_ptr_ind(ref) {
    for (let b = 0; b < 8; ++b) {
      const opcode = `bit_${b}_ptr_ind`;
      ref[index_bit[opcode]] = () => {
        this.setNextCommand(20, () => {
          this.advancePC(4);
          const addr = this.calculateBitOffsetAddress();
          const value = this.readByte(addr);
          this.bit_08(value, b);
        });
      };
    }
  }

  register_res_b_ptr_ind(ref) {
    for (let b = 0; b < 8; ++b) {
      const opcode = `res_${b}_ptr_ind`;
      ref[index_bit[opcode]] = () => {
        this.setNextCommand(23, () => {
          this.advancePC(4);
          const addr = this.calculateBitOffsetAddress();
          const value = this.readByte(addr);
          const result = this.res_08(value, b);
          this.writeByte(addr, result);
        });
      };
    }
  }

  register_set_b_ptr_ind(ref) {
    for (let b = 0; b < 8; ++b) {
      const opcode = `set_${b}_ptr_ind`;
      ref[index_bit[opcode]] = () => {
        this.setNextCommand(23, () => {
          this.advancePC(4);
          const addr = this.calculateBitOffsetAddress();
          const value = this.readByte(addr);
          const result = this.set_08(value, b);
          this.writeByte(addr, result);
        });
      };
    }
  }

  registerIndexBit() {
    this.index_bit = {};
    const ref = this.index_bit;

    ref[index_bit.rlc_ptr_ind] = this.rlc_ptr_ind;
    ref[index_bit.rrc_ptr_ind] = this.rrc_ptr_ind;
    ref[index_bit.rl_ptr_ind] = this.rl_ptr_ind;
    ref[index_bit.rr_ptr_ind] = this.rr_ptr_ind;
    ref[index_bit.sla_ptr_ind] = this.sla_ptr_ind;
    ref[index_bit.sra_ptr_ind] = this.sra_ptr_ind;
    ref[index_bit.srl_ptr_ind] = this.srl_ptr_ind;

    this.register_bit_b_ptr_ind(ref);
    this.register_res_b_ptr_ind(ref);
    this.register_set_b_ptr_ind(ref);
  }
}

Z80Cpu.INT_MODE_0 = 0;
Z80Cpu.INT_MODE_1 = 1;
Z80Cpu.INT_MODE_2 = 2;

export default Z80Cpu;
