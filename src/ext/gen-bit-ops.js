const regs = [
  'b',
  'c',
  'd',
  'e',
  'h',
  'l',
  'ptr hl',
  'a',
];

const ops = [
  'rlc',
  'rrc',
  'rl',
  'rr',
  'sla',
  'sra',
  'sll',
  'srl',
]

const outGen = (op) => {
  console.log(`gen.generate('${op}');`);
};

const genBitOp = (op) => {
  for (let bit of [0, 1, 2, 3, 4, 5, 6, 7]) {
    for (let reg of regs) {
      outGen(`${op} ${bit} ${reg}`);
    }
    console.log();
  }
};

for (let op of ops) {
  for (let reg of regs) {
    outGen(`${op} ${reg}`);
  }

  console.log();
}

genBitOp('bit');
genBitOp('res');
genBitOp('set');
