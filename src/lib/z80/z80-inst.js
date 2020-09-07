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
gen.generate('rlc_b');
gen.generate('rlc_c');
gen.generate('rlc_d');
gen.generate('rlc_e');
gen.generate('rlc_h');
gen.generate('rlc_l');
gen.generate('rlc_ptr_hl');
gen.generate('rlc_a');

gen.generate('rrc_b');
gen.generate('rrc_c');
gen.generate('rrc_d');
gen.generate('rrc_e');
gen.generate('rrc_h');
gen.generate('rrc_l');
gen.generate('rrc_ptr_hl');
gen.generate('rrc_a');

gen.generate('rl_b');
gen.generate('rl_c');
gen.generate('rl_d');
gen.generate('rl_e');
gen.generate('rl_h');
gen.generate('rl_l');
gen.generate('rl_ptr_hl');
gen.generate('rl_a');

gen.generate('rr_b');
gen.generate('rr_c');
gen.generate('rr_d');
gen.generate('rr_e');
gen.generate('rr_h');
gen.generate('rr_l');
gen.generate('rr_ptr_hl');
gen.generate('rr_a');

gen.generate('sla_b');
gen.generate('sla_c');
gen.generate('sla_d');
gen.generate('sla_e');
gen.generate('sla_h');
gen.generate('sla_l');
gen.generate('sla_ptr_hl');
gen.generate('sla_a');

gen.generate('sra_b');
gen.generate('sra_c');
gen.generate('sra_d');
gen.generate('sra_e');
gen.generate('sra_h');
gen.generate('sra_l');
gen.generate('sra_ptr_hl');
gen.generate('sra_a');

gen.generate('sll_b');
gen.generate('sll_c');
gen.generate('sll_d');
gen.generate('sll_e');
gen.generate('sll_h');
gen.generate('sll_l');
gen.generate('sll_ptr_hl');
gen.generate('sll_a');

gen.generate('srl_b');
gen.generate('srl_c');
gen.generate('srl_d');
gen.generate('srl_e');
gen.generate('srl_h');
gen.generate('srl_l');
gen.generate('srl_ptr_hl');
gen.generate('srl_a');

gen.generate('bit_0_b');
gen.generate('bit_0_c');
gen.generate('bit_0_d');
gen.generate('bit_0_e');
gen.generate('bit_0_h');
gen.generate('bit_0_l');
gen.generate('bit_0_ptr_hl');
gen.generate('bit_0_a');

gen.generate('bit_1_b');
gen.generate('bit_1_c');
gen.generate('bit_1_d');
gen.generate('bit_1_e');
gen.generate('bit_1_h');
gen.generate('bit_1_l');
gen.generate('bit_1_ptr_hl');
gen.generate('bit_1_a');

gen.generate('bit_2_b');
gen.generate('bit_2_c');
gen.generate('bit_2_d');
gen.generate('bit_2_e');
gen.generate('bit_2_h');
gen.generate('bit_2_l');
gen.generate('bit_2_ptr_hl');
gen.generate('bit_2_a');

gen.generate('bit_3_b');
gen.generate('bit_3_c');
gen.generate('bit_3_d');
gen.generate('bit_3_e');
gen.generate('bit_3_h');
gen.generate('bit_3_l');
gen.generate('bit_3_ptr_hl');
gen.generate('bit_3_a');

gen.generate('bit_4_b');
gen.generate('bit_4_c');
gen.generate('bit_4_d');
gen.generate('bit_4_e');
gen.generate('bit_4_h');
gen.generate('bit_4_l');
gen.generate('bit_4_ptr_hl');
gen.generate('bit_4_a');

gen.generate('bit_5_b');
gen.generate('bit_5_c');
gen.generate('bit_5_d');
gen.generate('bit_5_e');
gen.generate('bit_5_h');
gen.generate('bit_5_l');
gen.generate('bit_5_ptr_hl');
gen.generate('bit_5_a');

gen.generate('bit_6_b');
gen.generate('bit_6_c');
gen.generate('bit_6_d');
gen.generate('bit_6_e');
gen.generate('bit_6_h');
gen.generate('bit_6_l');
gen.generate('bit_6_ptr_hl');
gen.generate('bit_6_a');

gen.generate('bit_7_b');
gen.generate('bit_7_c');
gen.generate('bit_7_d');
gen.generate('bit_7_e');
gen.generate('bit_7_h');
gen.generate('bit_7_l');
gen.generate('bit_7_ptr_hl');
gen.generate('bit_7_a');

gen.generate('res_0_b');
gen.generate('res_0_c');
gen.generate('res_0_d');
gen.generate('res_0_e');
gen.generate('res_0_h');
gen.generate('res_0_l');
gen.generate('res_0_ptr_hl');
gen.generate('res_0_a');

gen.generate('res_1_b');
gen.generate('res_1_c');
gen.generate('res_1_d');
gen.generate('res_1_e');
gen.generate('res_1_h');
gen.generate('res_1_l');
gen.generate('res_1_ptr_hl');
gen.generate('res_1_a');

gen.generate('res_2_b');
gen.generate('res_2_c');
gen.generate('res_2_d');
gen.generate('res_2_e');
gen.generate('res_2_h');
gen.generate('res_2_l');
gen.generate('res_2_ptr_hl');
gen.generate('res_2_a');

gen.generate('res_3_b');
gen.generate('res_3_c');
gen.generate('res_3_d');
gen.generate('res_3_e');
gen.generate('res_3_h');
gen.generate('res_3_l');
gen.generate('res_3_ptr_hl');
gen.generate('res_3_a');

gen.generate('res_4_b');
gen.generate('res_4_c');
gen.generate('res_4_d');
gen.generate('res_4_e');
gen.generate('res_4_h');
gen.generate('res_4_l');
gen.generate('res_4_ptr_hl');
gen.generate('res_4_a');

gen.generate('res_5_b');
gen.generate('res_5_c');
gen.generate('res_5_d');
gen.generate('res_5_e');
gen.generate('res_5_h');
gen.generate('res_5_l');
gen.generate('res_5_ptr_hl');
gen.generate('res_5_a');

gen.generate('res_6_b');
gen.generate('res_6_c');
gen.generate('res_6_d');
gen.generate('res_6_e');
gen.generate('res_6_h');
gen.generate('res_6_l');
gen.generate('res_6_ptr_hl');
gen.generate('res_6_a');

gen.generate('res_7_b');
gen.generate('res_7_c');
gen.generate('res_7_d');
gen.generate('res_7_e');
gen.generate('res_7_h');
gen.generate('res_7_l');
gen.generate('res_7_ptr_hl');
gen.generate('res_7_a');

gen.generate('set_0_b');
gen.generate('set_0_c');
gen.generate('set_0_d');
gen.generate('set_0_e');
gen.generate('set_0_h');
gen.generate('set_0_l');
gen.generate('set_0_ptr_hl');
gen.generate('set_0_a');

gen.generate('set_1_b');
gen.generate('set_1_c');
gen.generate('set_1_d');
gen.generate('set_1_e');
gen.generate('set_1_h');
gen.generate('set_1_l');
gen.generate('set_1_ptr_hl');
gen.generate('set_1_a');

gen.generate('set_2_b');
gen.generate('set_2_c');
gen.generate('set_2_d');
gen.generate('set_2_e');
gen.generate('set_2_h');
gen.generate('set_2_l');
gen.generate('set_2_ptr_hl');
gen.generate('set_2_a');

gen.generate('set_3_b');
gen.generate('set_3_c');
gen.generate('set_3_d');
gen.generate('set_3_e');
gen.generate('set_3_h');
gen.generate('set_3_l');
gen.generate('set_3_ptr_hl');
gen.generate('set_3_a');

gen.generate('set_4_b');
gen.generate('set_4_c');
gen.generate('set_4_d');
gen.generate('set_4_e');
gen.generate('set_4_h');
gen.generate('set_4_l');
gen.generate('set_4_ptr_hl');
gen.generate('set_4_a');

gen.generate('set_5_b');
gen.generate('set_5_c');
gen.generate('set_5_d');
gen.generate('set_5_e');
gen.generate('set_5_h');
gen.generate('set_5_l');
gen.generate('set_5_ptr_hl');
gen.generate('set_5_a');

gen.generate('set_6_b');
gen.generate('set_6_c');
gen.generate('set_6_d');
gen.generate('set_6_e');
gen.generate('set_6_h');
gen.generate('set_6_l');
gen.generate('set_6_ptr_hl');
gen.generate('set_6_a');

gen.generate('set_7_b');
gen.generate('set_7_c');
gen.generate('set_7_d');
gen.generate('set_7_e');
gen.generate('set_7_h');
gen.generate('set_7_l');
gen.generate('set_7_ptr_hl');
gen.generate('set_7_a');


