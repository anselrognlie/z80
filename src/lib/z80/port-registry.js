import AddressMap from './address-map';

class PortRegistry {
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

  findMap(port) {
    const registry = this.registry;
    return registry.find(el => el.start <= port && el.end > port);
  }

  writeByte(port, high, value) {
    const map = this.findMap(port);
    if (! map) {
      return;
    }

    const reloc = port - map.start;
    map.consumer.writeByte(reloc, high, value);
  }

  readByte(port, high) {
    const map = this.findMap(port);
    if (! map) {
      return 0;
    }

    const reloc = port - map.start;
    return map.consumer.readByte(reloc, high);
  }
}

export default PortRegistry;
