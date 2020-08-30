expect.extend({
  toMatchStruct(s0, s1) {
    // console.log({ s0, s1 });
    for (let k of Object.keys(s1)) {
      const value = s1[k];
      if (! Object.prototype.hasOwnProperty.call(s0, k)) {
        return {
          message: () => (
            `expected struct to have key [${k}] with value [${value}]`
          ),
          pass: false,
        };
      }

      const found = s0[k];
      if (! (value === found)) {
        return {
          message: () => (
            `expected struct to have key [${k}] with value [${value}], found [${found}]`
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
