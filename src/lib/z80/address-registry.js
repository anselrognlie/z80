import AddressMap from './address-map';

class AddressRegistry {
  constructor() {
    this.registry = [];
  }

  register(start, consumer) {
    const addressMap = new AddressMap(start, start + consumer.size, consumer);
    const pos = this.findInsertPosition(addressMap);
    this.registry.splice(pos, 0, addressMap);
  }

  findInsertPosition(addressMap) {
    // we store in sorted address range order, so could do a binary search

    // find the first record with a start larger than our start
    const start = addressMap.start;
    const registry = this.registry;
    const pos = registry.findIndex(el => el.start > start);

    return pos >= 0 ? pos : 0;
  }

  get length() {
    return this.registry.length;
  }

  findMap(addr) {
    const registry = this.registry;
    return registry.find(el => el.start <= addr && el.end > addr);
  }

  writeOne(addr, value) {
    const map = this.findMap(addr);
    if (! map) {
      return;
    }

    const reloc = addr - map.start;
    map.consumer.writeOne(reloc, value);
  }

  writeMany(addr, values) {
    const map = this.findMap(addr);
    if (! map) {
      return;
    }

    const reloc = addr - map.start;
    map.consumer.writeMany(reloc, values);
  }

  readOne(addr) {
    const map = this.findMap(addr);
    if (! map) {
      return 0;
    }

    const reloc = addr - map.start;
    return map.consumer.readOne(reloc);
  }

  readMany(addr, length) {
    const map = this.findMap(addr);
    if (! map) {
      const values = new Array(length);
      values.fill(0);
      return values;
    }

    const reloc = addr - map.start;
    return map.consumer.readMany(reloc, length);
  }
}

export default AddressRegistry;
