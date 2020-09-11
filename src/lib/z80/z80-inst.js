class InstructionGenerator {
  constructor(host) {
    this.opcode = 0;
    this.host = host;
  }

  generate(mnemonic) {
    mnemonic = mnemonic.replace(/ /g, '_')
    // this.host[mnemonic] = { mnemonic, opcode: this.opcode++ };
    this.host[mnemonic] = this.opcode++;
  }

  setOpcode(opcode) {
    this.opcode = opcode;
  }

  skipOpcode(count = 1) {
    this.opcode += count;
  }
}

export class Z80Instructions {}
export class Z80Extended {}
export class Z80Bit {}
export class Z80Index {}
export class Z80IndexBit {}

let gen = new InstructionGenerator(Z80Instructions);

// 0x00
gen.generate('nop');
gen.generate('ld bc imm');
gen.generate('ld ptr bc a');
gen.generate('inc bc');
gen.generate('inc b');
gen.generate('dec b');
gen.generate('ld b imm');
gen.generate('rlca');

gen.generate('ex af');
gen.generate('add hl bc');
gen.generate('ld a ptr bc');
gen.generate('dec bc');
gen.generate('inc c');
gen.generate('dec c');
gen.generate('ld c imm');
gen.generate('rrca');

// 0x10
gen.generate('djnz imm');
gen.generate('ld de imm');
gen.generate('ld ptr de a');
gen.generate('inc de');
gen.generate('inc d');
gen.generate('dec d');
gen.generate('ld d imm');
gen.generate('rla');

gen.generate('jr imm');
gen.generate('add hl de');
gen.generate('ld a ptr de');
gen.generate('dec de');
gen.generate('inc e');
gen.generate('dec e');
gen.generate('ld e imm');
gen.generate('rra');

// 0x20
gen.generate('jr nz imm');
gen.generate('ld hl imm');
gen.generate('ld ptr imm hl');
gen.generate('inc hl');
gen.generate('inc h');
gen.generate('dec h');
gen.generate('ld h imm');
gen.generate('daa');

gen.generate('jr z imm');
gen.generate('add hl hl');
gen.generate('ld hl ptr imm');
gen.generate('dec hl');
gen.generate('inc l');
gen.generate('dec l');
gen.generate('ld l imm');
gen.generate('cpl');

// 0x30
gen.generate('jr nc imm');
gen.generate('ld sp imm');
gen.generate('ld ptr imm a');
gen.generate('inc sp');
gen.generate('inc ptr hl');
gen.generate('dec ptr hl');
gen.generate('ld ptr hl imm');
gen.generate('scf');

gen.generate('jr c imm');
gen.generate('add hl sp');
gen.generate('ld a ptr imm');
gen.generate('dec sp');
gen.generate('inc a');
gen.generate('dec a');
gen.generate('ld a imm');
gen.generate('ccf');

// 0x40
gen.generate('ld b b');
gen.generate('ld b c');
gen.generate('ld b d');
gen.generate('ld b e');
gen.generate('ld b h');
gen.generate('ld b l');
gen.generate('ld b ptr hl');
gen.generate('ld b a');

gen.generate('ld c b');
gen.generate('ld c c');
gen.generate('ld c d');
gen.generate('ld c e');
gen.generate('ld c h');
gen.generate('ld c l');
gen.generate('ld c ptr hl');
gen.generate('ld c a');

// 0x50
gen.generate('ld d b');
gen.generate('ld d c');
gen.generate('ld d d');
gen.generate('ld d e');
gen.generate('ld d h');
gen.generate('ld d l');
gen.generate('ld d ptr hl');
gen.generate('ld d a');

gen.generate('ld e b');
gen.generate('ld e c');
gen.generate('ld e d');
gen.generate('ld e e');
gen.generate('ld e h');
gen.generate('ld e l');
gen.generate('ld e ptr hl');
gen.generate('ld e a');

// 0x60
gen.generate('ld h b');
gen.generate('ld h c');
gen.generate('ld h d');
gen.generate('ld h e');
gen.generate('ld h h');
gen.generate('ld h l');
gen.generate('ld h ptr hl');
gen.generate('ld h a');

gen.generate('ld l b');
gen.generate('ld l c');
gen.generate('ld l d');
gen.generate('ld l e');
gen.generate('ld l h');
gen.generate('ld l l');
gen.generate('ld l ptr hl');
gen.generate('ld l a');

// 0x70
gen.generate('ld ptr hl b');
gen.generate('ld ptr hl c');
gen.generate('ld ptr hl d');
gen.generate('ld ptr hl e');
gen.generate('ld ptr hl h');
gen.generate('ld ptr hl l');
gen.generate('halt');
gen.generate('ld ptr hl a');

gen.generate('ld a b');
gen.generate('ld a c');
gen.generate('ld a d');
gen.generate('ld a e');
gen.generate('ld a h');
gen.generate('ld a l');
gen.generate('ld a ptr hl');
gen.generate('ld a a');

// 0x80
gen.generate('add a b');
gen.generate('add a c');
gen.generate('add a d');
gen.generate('add a e');
gen.generate('add a h');
gen.generate('add a l');
gen.generate('add a ptr hl');
gen.generate('add a a');

gen.generate('adc a b');
gen.generate('adc a c');
gen.generate('adc a d');
gen.generate('adc a e');
gen.generate('adc a h');
gen.generate('adc a l');
gen.generate('adc a ptr hl');
gen.generate('adc a a');

// 0x90
gen.generate('sub b');
gen.generate('sub c');
gen.generate('sub d');
gen.generate('sub e');
gen.generate('sub h');
gen.generate('sub l');
gen.generate('sub ptr hl');
gen.generate('sub a');

gen.generate('sbc a b');
gen.generate('sbc a c');
gen.generate('sbc a d');
gen.generate('sbc a e');
gen.generate('sbc a h');
gen.generate('sbc a l');
gen.generate('sbc a ptr hl');
gen.generate('sbc a a');

// 0xa0
gen.generate('and b');
gen.generate('and c');
gen.generate('and d');
gen.generate('and e');
gen.generate('and h');
gen.generate('and l');
gen.generate('and ptr hl');
gen.generate('and a');

gen.generate('xor b');
gen.generate('xor c');
gen.generate('xor d');
gen.generate('xor e');
gen.generate('xor h');
gen.generate('xor l');
gen.generate('xor ptr hl');
gen.generate('xor a');

// 0xb0
gen.generate('or b');
gen.generate('or c');
gen.generate('or d');
gen.generate('or e');
gen.generate('or h');
gen.generate('or l');
gen.generate('or ptr hl');
gen.generate('or a');

gen.generate('cp b');
gen.generate('cp c');
gen.generate('cp d');
gen.generate('cp e');
gen.generate('cp h');
gen.generate('cp l');
gen.generate('cp ptr hl');
gen.generate('cp a');

// 0xc0
gen.generate('ret nz');
gen.generate('pop bc');
gen.generate('jp nz imm');
gen.generate('jp imm');
gen.generate('call nz imm');
gen.generate('push bc');
gen.generate('add a imm');
gen.generate('rst 00');

gen.generate('ret z');
gen.generate('ret');
gen.generate('jp z imm');
gen.generate('pre bit');
gen.generate('call z imm');
gen.generate('call imm');
gen.generate('adc a imm');
gen.generate('rst 08');

// 0xd0
gen.generate('ret nc');
gen.generate('pop de');
gen.generate('jp nc imm');
gen.generate('out ptr imm a');
gen.generate('call nc imm');
gen.generate('push de');
gen.generate('sub imm');
gen.generate('rst 10');

gen.generate('ret c');
gen.generate('exx');
gen.generate('jp c imm');
gen.generate('in a ptr imm');
gen.generate('call c imm');
gen.generate('pre ix');
gen.generate('sbc a imm');
gen.generate('rst 18');

// 0xe0
gen.generate('ret po');
gen.generate('pop hl');
gen.generate('jp po imm');
gen.generate('ex ptr sp hl');
gen.generate('call po imm');
gen.generate('push hl');
gen.generate('and imm');
gen.generate('rst 20');

gen.generate('ret pe');
gen.generate('jp ptr hl');
gen.generate('jp pe imm');
gen.generate('ex de hl');
gen.generate('call pe imm');
gen.generate('pre 80');
gen.generate('xor imm');
gen.generate('rst 28');

// 0xf0
gen.generate('ret p');
gen.generate('pop af');
gen.generate('jp p imm');
gen.generate('di');
gen.generate('call p imm');
gen.generate('push af');
gen.generate('or imm');
gen.generate('rst 30');

gen.generate('ret m');
gen.generate('ld sp hl');
gen.generate('jp m imm');
gen.generate('ei');
gen.generate('call m imm');
gen.generate('pre iy');
gen.generate('cp imm');
gen.generate('rst 38');

gen = new InstructionGenerator(Z80Extended);
gen.setOpcode(0x040);

// 0x40
gen.generate('in b ptr c');
gen.generate('out ptr c b');
gen.generate('sbc hl bc');
gen.generate('ld ptr imm bc');
gen.generate('neg');
gen.generate('retn');
gen.generate('im 0');
gen.generate('ld i a');

gen.generate('in c ptr c');
gen.generate('out ptr c c');
gen.generate('adc hl bc');
gen.generate('ld bc ptr imm');
gen.skipOpcode();
gen.generate('reti');
gen.skipOpcode();
gen.generate('ld r a');

// 0x50
gen.generate('in d ptr c');
gen.generate('out ptr c d');
gen.generate('sbc hl de');
gen.generate('ld ptr imm de');
gen.skipOpcode();
gen.skipOpcode();
gen.generate('im 1');
gen.generate('ld a i');

gen.generate('in e ptr c');
gen.generate('out ptr c e');
gen.generate('adc hl de');
gen.generate('ld de ptr imm');
gen.skipOpcode();
gen.skipOpcode();
gen.generate('im 2');
gen.generate('ld a r');

// 0x60
gen.generate('in h ptr c');
gen.generate('out ptr c h');
gen.generate('sbc hl hl');
gen.generate('ld ptr imm hl');
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();
gen.generate('rrd');

gen.generate('in l ptr c');
gen.generate('out ptr c l');
gen.generate('adc hl hl');
gen.generate('ld hl ptr imm');
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();
gen.generate('rld');

// 0x70
gen.generate('in f ptr c');
gen.generate('out ptr c f');
gen.generate('sbc hl sp');
gen.generate('ld ptr imm sp');
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();

gen.generate('in a ptr c');
gen.generate('out ptr c a');
gen.generate('adc hl sp');
gen.generate('ld sp ptr imm');
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();
gen.skipOpcode();


// 0xa0
gen.setOpcode(0x0a0);
gen.generate('ldi');
gen.generate('cpi');
gen.generate('ini');
gen.generate('outi');

gen.setOpcode(0x0a8);
gen.generate('ldd');
gen.generate('cpd');
gen.generate('ind');
gen.generate('outd');

// 0xb0
gen.setOpcode(0x0b0);
gen.generate('ldir');
gen.generate('cpir');
gen.generate('inir');
gen.generate('otir');

gen.setOpcode(0x0b8);
gen.generate('lddr');
gen.generate('cpdr');
gen.generate('indr');
gen.generate('otdr');

gen = new InstructionGenerator(Z80Bit);
gen.generate('rlc b');
gen.generate('rlc c');
gen.generate('rlc d');
gen.generate('rlc e');
gen.generate('rlc h');
gen.generate('rlc l');
gen.generate('rlc ptr hl');
gen.generate('rlc a');

gen.generate('rrc b');
gen.generate('rrc c');
gen.generate('rrc d');
gen.generate('rrc e');
gen.generate('rrc h');
gen.generate('rrc l');
gen.generate('rrc ptr hl');
gen.generate('rrc a');

gen.generate('rl b');
gen.generate('rl c');
gen.generate('rl d');
gen.generate('rl e');
gen.generate('rl h');
gen.generate('rl l');
gen.generate('rl ptr hl');
gen.generate('rl a');

gen.generate('rr b');
gen.generate('rr c');
gen.generate('rr d');
gen.generate('rr e');
gen.generate('rr h');
gen.generate('rr l');
gen.generate('rr ptr hl');
gen.generate('rr a');

gen.generate('sla b');
gen.generate('sla c');
gen.generate('sla d');
gen.generate('sla e');
gen.generate('sla h');
gen.generate('sla l');
gen.generate('sla ptr hl');
gen.generate('sla a');

gen.generate('sra b');
gen.generate('sra c');
gen.generate('sra d');
gen.generate('sra e');
gen.generate('sra h');
gen.generate('sra l');
gen.generate('sra ptr hl');
gen.generate('sra a');

gen.generate('sll b');
gen.generate('sll c');
gen.generate('sll d');
gen.generate('sll e');
gen.generate('sll h');
gen.generate('sll l');
gen.generate('sll ptr hl');
gen.generate('sll a');

gen.generate('srl b');
gen.generate('srl c');
gen.generate('srl d');
gen.generate('srl e');
gen.generate('srl h');
gen.generate('srl l');
gen.generate('srl ptr hl');
gen.generate('srl a');

gen.generate('bit 0 b');
gen.generate('bit 0 c');
gen.generate('bit 0 d');
gen.generate('bit 0 e');
gen.generate('bit 0 h');
gen.generate('bit 0 l');
gen.generate('bit 0 ptr hl');
gen.generate('bit 0 a');

gen.generate('bit 1 b');
gen.generate('bit 1 c');
gen.generate('bit 1 d');
gen.generate('bit 1 e');
gen.generate('bit 1 h');
gen.generate('bit 1 l');
gen.generate('bit 1 ptr hl');
gen.generate('bit 1 a');

gen.generate('bit 2 b');
gen.generate('bit 2 c');
gen.generate('bit 2 d');
gen.generate('bit 2 e');
gen.generate('bit 2 h');
gen.generate('bit 2 l');
gen.generate('bit 2 ptr hl');
gen.generate('bit 2 a');

gen.generate('bit 3 b');
gen.generate('bit 3 c');
gen.generate('bit 3 d');
gen.generate('bit 3 e');
gen.generate('bit 3 h');
gen.generate('bit 3 l');
gen.generate('bit 3 ptr hl');
gen.generate('bit 3 a');

gen.generate('bit 4 b');
gen.generate('bit 4 c');
gen.generate('bit 4 d');
gen.generate('bit 4 e');
gen.generate('bit 4 h');
gen.generate('bit 4 l');
gen.generate('bit 4 ptr hl');
gen.generate('bit 4 a');

gen.generate('bit 5 b');
gen.generate('bit 5 c');
gen.generate('bit 5 d');
gen.generate('bit 5 e');
gen.generate('bit 5 h');
gen.generate('bit 5 l');
gen.generate('bit 5 ptr hl');
gen.generate('bit 5 a');

gen.generate('bit 6 b');
gen.generate('bit 6 c');
gen.generate('bit 6 d');
gen.generate('bit 6 e');
gen.generate('bit 6 h');
gen.generate('bit 6 l');
gen.generate('bit 6 ptr hl');
gen.generate('bit 6 a');

gen.generate('bit 7 b');
gen.generate('bit 7 c');
gen.generate('bit 7 d');
gen.generate('bit 7 e');
gen.generate('bit 7 h');
gen.generate('bit 7 l');
gen.generate('bit 7 ptr hl');
gen.generate('bit 7 a');

gen.generate('res 0 b');
gen.generate('res 0 c');
gen.generate('res 0 d');
gen.generate('res 0 e');
gen.generate('res 0 h');
gen.generate('res 0 l');
gen.generate('res 0 ptr hl');
gen.generate('res 0 a');

gen.generate('res 1 b');
gen.generate('res 1 c');
gen.generate('res 1 d');
gen.generate('res 1 e');
gen.generate('res 1 h');
gen.generate('res 1 l');
gen.generate('res 1 ptr hl');
gen.generate('res 1 a');

gen.generate('res 2 b');
gen.generate('res 2 c');
gen.generate('res 2 d');
gen.generate('res 2 e');
gen.generate('res 2 h');
gen.generate('res 2 l');
gen.generate('res 2 ptr hl');
gen.generate('res 2 a');

gen.generate('res 3 b');
gen.generate('res 3 c');
gen.generate('res 3 d');
gen.generate('res 3 e');
gen.generate('res 3 h');
gen.generate('res 3 l');
gen.generate('res 3 ptr hl');
gen.generate('res 3 a');

gen.generate('res 4 b');
gen.generate('res 4 c');
gen.generate('res 4 d');
gen.generate('res 4 e');
gen.generate('res 4 h');
gen.generate('res 4 l');
gen.generate('res 4 ptr hl');
gen.generate('res 4 a');

gen.generate('res 5 b');
gen.generate('res 5 c');
gen.generate('res 5 d');
gen.generate('res 5 e');
gen.generate('res 5 h');
gen.generate('res 5 l');
gen.generate('res 5 ptr hl');
gen.generate('res 5 a');

gen.generate('res 6 b');
gen.generate('res 6 c');
gen.generate('res 6 d');
gen.generate('res 6 e');
gen.generate('res 6 h');
gen.generate('res 6 l');
gen.generate('res 6 ptr hl');
gen.generate('res 6 a');

gen.generate('res 7 b');
gen.generate('res 7 c');
gen.generate('res 7 d');
gen.generate('res 7 e');
gen.generate('res 7 h');
gen.generate('res 7 l');
gen.generate('res 7 ptr hl');
gen.generate('res 7 a');

gen.generate('set 0 b');
gen.generate('set 0 c');
gen.generate('set 0 d');
gen.generate('set 0 e');
gen.generate('set 0 h');
gen.generate('set 0 l');
gen.generate('set 0 ptr hl');
gen.generate('set 0 a');

gen.generate('set 1 b');
gen.generate('set 1 c');
gen.generate('set 1 d');
gen.generate('set 1 e');
gen.generate('set 1 h');
gen.generate('set 1 l');
gen.generate('set 1 ptr hl');
gen.generate('set 1 a');

gen.generate('set 2 b');
gen.generate('set 2 c');
gen.generate('set 2 d');
gen.generate('set 2 e');
gen.generate('set 2 h');
gen.generate('set 2 l');
gen.generate('set 2 ptr hl');
gen.generate('set 2 a');

gen.generate('set 3 b');
gen.generate('set 3 c');
gen.generate('set 3 d');
gen.generate('set 3 e');
gen.generate('set 3 h');
gen.generate('set 3 l');
gen.generate('set 3 ptr hl');
gen.generate('set 3 a');

gen.generate('set 4 b');
gen.generate('set 4 c');
gen.generate('set 4 d');
gen.generate('set 4 e');
gen.generate('set 4 h');
gen.generate('set 4 l');
gen.generate('set 4 ptr hl');
gen.generate('set 4 a');

gen.generate('set 5 b');
gen.generate('set 5 c');
gen.generate('set 5 d');
gen.generate('set 5 e');
gen.generate('set 5 h');
gen.generate('set 5 l');
gen.generate('set 5 ptr hl');
gen.generate('set 5 a');

gen.generate('set 6 b');
gen.generate('set 6 c');
gen.generate('set 6 d');
gen.generate('set 6 e');
gen.generate('set 6 h');
gen.generate('set 6 l');
gen.generate('set 6 ptr hl');
gen.generate('set 6 a');

gen.generate('set 7 b');
gen.generate('set 7 c');
gen.generate('set 7 d');
gen.generate('set 7 e');
gen.generate('set 7 h');
gen.generate('set 7 l');
gen.generate('set 7 ptr hl');
gen.generate('set 7 a');

Z80Index.add_ind_bc = Z80Instructions.add_hl_bc
Z80Index.add_ind_de = Z80Instructions.add_hl_de
Z80Index.ld_ind_imm = Z80Instructions.ld_hl_imm
Z80Index.ld_ptr_imm_ind = Z80Instructions.ld_ptr_imm_hl
Z80Index.inc_ind = Z80Instructions.inc_hl
Z80Index.add_hl_ind = Z80Instructions.add_hl_hl
Z80Index.ld_ind_ptr_imm = Z80Instructions.ld_hl_ptr_imm
Z80Index.dec_ind = Z80Instructions.dec_hl
Z80Index.inc_ptr_ind = Z80Instructions.inc_ptr_hl
Z80Index.dec_ptr_ind = Z80Instructions.dec_ptr_hl
Z80Index.ld_ptr_ind_imm = Z80Instructions.ld_ptr_hl_imm
Z80Index.add_ind_sp = Z80Instructions.add_hl_sp
Z80Index.ld_b_ptr_ind = Z80Instructions.ld_b_ptr_hl
Z80Index.ld_c_ptr_ind = Z80Instructions.ld_c_ptr_hl
Z80Index.ld_d_ptr_ind = Z80Instructions.ld_d_ptr_hl
Z80Index.ld_e_ptr_ind = Z80Instructions.ld_e_ptr_hl
Z80Index.ld_h_ptr_ind = Z80Instructions.ld_h_ptr_hl
Z80Index.ld_l_ptr_ind = Z80Instructions.ld_l_ptr_hl
Z80Index.ld_ptr_ind_b = Z80Instructions.ld_ptr_hl_b
Z80Index.ld_ptr_ind_c = Z80Instructions.ld_ptr_hl_c
Z80Index.ld_ptr_ind_d = Z80Instructions.ld_ptr_hl_d
Z80Index.ld_ptr_ind_e = Z80Instructions.ld_ptr_hl_e
Z80Index.ld_ptr_ind_h = Z80Instructions.ld_ptr_hl_h
Z80Index.ld_ptr_ind_l = Z80Instructions.ld_ptr_hl_l
Z80Index.ld_ptr_ind_a = Z80Instructions.ld_ptr_hl_a
Z80Index.ld_a_ptr_ind = Z80Instructions.ld_a_ptr_hl
Z80Index.add_a_ptr_ind = Z80Instructions.add_a_ptr_hl
Z80Index.adc_a_ptr_ind = Z80Instructions.adc_a_ptr_hl
Z80Index.sub_ptr_ind = Z80Instructions.sub_ptr_hl
Z80Index.sbc_a_ptr_ind = Z80Instructions.sbc_a_ptr_hl
Z80Index.and_ptr_ind = Z80Instructions.and_ptr_hl
Z80Index.xor_ptr_ind = Z80Instructions.xor_ptr_hl
Z80Index.or_ptr_ind = Z80Instructions.or_ptr_hl
Z80Index.cp_ptr_ind = Z80Instructions.cp_ptr_hl
Z80Index.pop_ind = Z80Instructions.pop_hl
Z80Index.ex_ptr_sp_ind = Z80Instructions.ex_ptr_sp_hl
Z80Index.push_ind = Z80Instructions.push_hl
Z80Index.jp_ptr_ind = Z80Instructions.jp_ptr_hl
Z80Index.ex_de_ind = Z80Instructions.ex_de_hl
Z80Index.ld_sp_ind = Z80Instructions.ld_sp_hl

Z80IndexBit.rlc_ptr_ind = Z80Bit.rlc_ptr_hl
Z80IndexBit.rrc_ptr_ind = Z80Bit.rrc_ptr_hl
Z80IndexBit.rl_ptr_ind = Z80Bit.rl_ptr_hl
Z80IndexBit.rr_ptr_ind = Z80Bit.rr_ptr_hl
Z80IndexBit.sla_ptr_ind = Z80Bit.sla_ptr_hl
Z80IndexBit.sra_ptr_ind = Z80Bit.sra_ptr_hl
Z80IndexBit.sll_ptr_ind = Z80Bit.sll_ptr_hl
Z80IndexBit.srl_ptr_ind = Z80Bit.srl_ptr_hl
Z80IndexBit.bit_0_ptr_ind = Z80Bit.bit_0_ptr_hl
Z80IndexBit.bit_1_ptr_ind = Z80Bit.bit_1_ptr_hl
Z80IndexBit.bit_2_ptr_ind = Z80Bit.bit_2_ptr_hl
Z80IndexBit.bit_3_ptr_ind = Z80Bit.bit_3_ptr_hl
Z80IndexBit.bit_4_ptr_ind = Z80Bit.bit_4_ptr_hl
Z80IndexBit.bit_5_ptr_ind = Z80Bit.bit_5_ptr_hl
Z80IndexBit.bit_6_ptr_ind = Z80Bit.bit_6_ptr_hl
Z80IndexBit.bit_7_ptr_ind = Z80Bit.bit_7_ptr_hl
Z80IndexBit.res_0_ptr_ind = Z80Bit.res_0_ptr_hl
Z80IndexBit.res_1_ptr_ind = Z80Bit.res_1_ptr_hl
Z80IndexBit.res_2_ptr_ind = Z80Bit.res_2_ptr_hl
Z80IndexBit.res_3_ptr_ind = Z80Bit.res_3_ptr_hl
Z80IndexBit.res_4_ptr_ind = Z80Bit.res_4_ptr_hl
Z80IndexBit.res_5_ptr_ind = Z80Bit.res_5_ptr_hl
Z80IndexBit.res_6_ptr_ind = Z80Bit.res_6_ptr_hl
Z80IndexBit.res_7_ptr_ind = Z80Bit.res_7_ptr_hl
Z80IndexBit.set_0_ptr_ind = Z80Bit.set_0_ptr_hl
Z80IndexBit.set_1_ptr_ind = Z80Bit.set_1_ptr_hl
Z80IndexBit.set_2_ptr_ind = Z80Bit.set_2_ptr_hl
Z80IndexBit.set_3_ptr_ind = Z80Bit.set_3_ptr_hl
Z80IndexBit.set_4_ptr_ind = Z80Bit.set_4_ptr_hl
Z80IndexBit.set_5_ptr_ind = Z80Bit.set_5_ptr_hl
Z80IndexBit.set_6_ptr_ind = Z80Bit.set_6_ptr_hl
Z80IndexBit.set_7_ptr_ind = Z80Bit.set_7_ptr_hl
