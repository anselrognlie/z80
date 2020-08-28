class AddressMap {
  constructor(start, end, consumer) {
    this._start = start;
    this._end = end;
    this._consumer = consumer;
  }

  get start() {
    return this._start;
  }

  get end() {
    return this._end;
  }

  get consumer() {
    return this._consumer;
  }
}

AddressMap.make = (start, consumer) => {
  const size = consumer.size;
  const end = start + size;
  return new AddressMap(start, end, consumer);
};

export default AddressMap;