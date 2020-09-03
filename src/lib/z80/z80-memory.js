import AddressError from './address-error';

class Z80MemoryError extends Error {}

class Z80Memory {
  constructor(size) {
    this.bytes = new Array(size);
    this.bytes.fill(0);
  }

  load(addr, values) {
    for (let [i, v] of values.entries()) {
      if (typeof v !== "number") {
        const v_addr = (addr + i).toString(16);
        throw new Z80MemoryError(`encountered invalid value at addr [${v_addr}]`);
      }
    }

    this.writeMany(addr, values);
  }

  readWord(addr) {
    const values = this.readMany(addr, 2);
    return (values[1] << 8) | values[0];
  }

  // consumer api

  get size() {
    return this.bytes.length;
  }

  writeOne(addr, value) {
    if (addr > this.bytes.length - 1) {
      throw new AddressError();
    }

    this.bytes[addr] = value;
  }

  writeMany(addr, values) {
    const len = values.length;
    if (addr + len > this.bytes.length) {
      throw new AddressError();
    }

    this.bytes.splice(addr, len, ...values)
  }

  readOne(addr) {
    if (addr > this.bytes.length - 1) {
      throw new AddressError();
    }

    return this.bytes[addr];
  }

  readMany(addr, length) {
    if (addr + length > this.bytes.length) {
      throw new AddressError();
    }

    return this.bytes.slice(addr, addr + length)
  }
}

export default Z80Memory;
