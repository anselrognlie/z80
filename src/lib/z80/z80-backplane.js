import AddressRegistry from './address-registry';
import PortRegistry from './port-registry';

class Z80Backplane {
  constructor() {
    this.addresses = new AddressRegistry();
    this.devices = [];
    this.ports = new PortRegistry();
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

  writePort(port, high, value) {
    this.ports.writeByte(port, high, value);
  }

  readPort(port, high) {
    return this.ports.readByte(port, high);
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
