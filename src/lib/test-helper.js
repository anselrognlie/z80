expect.extend({
  toMatchStruct(s0, s1) {
    // console.log({ s0, s1 });
    for (let k of Object.keys(s1)) {
      const value = s1[k];
      const pass = (Object.prototype.hasOwnProperty.call(s0, k) && (value === s0[k]));
      if (! pass) {
        return {
          message: () => (
            `expected struct to have key [${k}] with value [${value}]`
          ),
          pass: false,
        };
      }
    }

    return {
      message: () => (
        `expected structs to differ`
      ),
      pass: true,
    };
  }
});
