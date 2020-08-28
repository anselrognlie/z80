import AddressRegistry from './address-registry';

class Z80Backplane {
  constructor() {
    this.addresses = new AddressRegistry();
    this.devices = [];
  }

  mapAddress(start, consumer) {
    this.addresses.register(start, consumer);
  }

  registerDevice(device) {
    this.devices.push(device);
    device.registerBus(this);
  }

  clock() {
    this.devices.forEach(d => d.clock())
  }

  writeOne(addr, value) {
    this.addresses.writeOne(addr, value);
  }

  writeMany(addr, values) {
    this.addresses.writeMany(addr, values);
  }

  readOne(addr) {
    return this.addresses.readOne(addr);
  }

  readMany(addr, length) {
    return this.addresses.readMany(addr, length);
  }
}

export default Z80Backplane;
