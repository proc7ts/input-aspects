import { afterEventFrom, EventEmitter, EventInterest } from 'fun-events';
import { InControl } from '../control';
import { inValue } from '../value';
import { requireAll } from './require-all.validator';
import { requireNothing } from './require-nothing.validator';
import { InValidation } from './validation.aspect';
import { InValidator } from './validator';
import Mock = jest.Mock;

describe('validIfAll', () => {

  let control: InControl<string>;
  let validation: InValidation<string>;

  beforeEach(() => {
    control = inValue('test');
    validation = control.aspect(InValidation);
  });

  let validator1: EventEmitter<InValidation.Message[]>;
  let validator2: EventEmitter<InValidation.Message[]>;
  let all: InValidator<string>;
  let allInterest: EventInterest;

  beforeEach(() => {
    validator1 = new EventEmitter();
    validator2 = new EventEmitter();
    all = requireAll(
        afterEventFrom(validator1, []),
        afterEventFrom(validator2, []));
    allInterest = validation.by(all);
  });

  let receiver: Mock;

  beforeEach(() => {
    receiver = jest.fn();
    validation.read(receiver);
    receiver.mockClear();
  });

  it('returns the only validator', () => {

    const validator = { validate() { return null; } };

    expect(requireAll(validator)).toBe(validator);
  });
  it('requires nothing for empty list', () => {
    expect(requireAll()).toBe(requireNothing);
  });
  it('sends messages from all validators', () => {

    const message1 = { message: 1 };
    const message2 = { message: 2 };

    validator1.send(message1);
    validator2.send(message2);

    expect([...lastResult()]).toEqual([message1, message2]);
  });
  it('sends messages when one validator removed', () => {

    const message1 = { message: 1 };
    const message2 = { message: 2 };

    validator1.send(message1);
    validator2.send(message2);
    validator2.done();

    expect([...lastResult()]).toEqual([message1]);

    const message3 = { message: 3 };

    validator1.send(message3);
    expect([...lastResult()]).toEqual([message3]);
  });
  it('stops sending messages when last validator removed', () => {

    const message1 = { message: 1 };
    const message2 = { message: 2 };

    validator1.send(message1);
    validator2.send(message2);

    validator1.done();
    validator2.done();
    expect(lastResult().ok).toBe(true);

    receiver.mockClear();
    validator1.send({ message: 3 });
    expect(receiver).not.toHaveBeenCalled();
  });

  function lastResult(): InValidation.Result {
    expect(receiver).toHaveBeenCalled();

    const calls = receiver.mock.calls;

    return calls[calls.length - 1][0];
  }
});
