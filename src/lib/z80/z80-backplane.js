import AddressRegistry from './address-registry';

class Z80Backplane {
  constructor() {
    this.addresses = new AddressRegistry();
    this.devices = [];
    this.ports = new AddressRegistry();
  }

  mapAddress(start, consumer) {
    this.addresses.register(start, consumer);
  }

  mapPort(start, consumer) {
    this.ports.register(start, consumer);
  }

  registerDevice(device) {
    this.devices.push(device);
    device.registerBus(this);
  }

  clock() {
    this.devices.forEach(d => d.clock())
  }

  writePort(port, value) {
    this.ports.writeOne(port, value);
  }

  readPort(port) {
    return this.ports.readOne(port);
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
