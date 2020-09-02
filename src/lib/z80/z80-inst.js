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
}

class Z80Instructions {}

const gen = new InstructionGenerator(Z80Instructions);

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
gen.generate('jp x imm');
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

export default Z80Instructions;