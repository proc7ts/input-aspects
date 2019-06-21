import { nextArgs, NextArgs, noop } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterEventFrom,
  EventEmitter,
  eventInterest,
  EventInterest,
  EventKeeper,
  isEventKeeper
} from 'fun-events';
import { InControl } from '../control';
import { InValidation } from './validation.aspect';
import { InValidator } from './validator';

const dontRemove = {};

/**
 * @internal
 */
export class InValidationMessages<Value> implements EventKeeper<InValidation.Message[]> {

  readonly [AfterEvent__symbol]: AfterEvent<InValidation.Message[]>;
  readonly from: (this: void, validator: InValidator<Value>) => EventInterest;

  constructor(control: InControl<Value>) {

    const emitter = new EventEmitter<InValidation.Message[]>();
    const validators = new Map<AfterEvent<InValidation.Message[]>, EventInterest>();
    const validatorMessages = new Map<InValidator<Value>, InValidation.Message[]>();
    // Sends validation messages
    let send: () => void = noop;
    // Validates using the given validator
    let validate: (validator: AfterEvent<InValidation.Message[]>, validatorInterest: EventInterest) => void = noop;

    this[AfterEvent__symbol] = afterEventBy(receiver => {

      // An interest for receiving validation messages
      const resultInterest = afterEventFrom(emitter, [])(receiver).whenDone(() => {
        send = noop; // Disable message sending
        validate = noop; // Disable validation
      });

      // Enable validation using the given validator
      validate = (validator: AfterEvent<InValidation.Message[]>, validatorInterest: EventInterest) => {

        const interest = validator((...messages) => {
          if (messages.length) {
            // Replace messages reported by validator.
            validatorMessages.set(validator, messages);
          } else if (!validatorMessages.delete(validator)) {
            // Nothing removed. No need to send messages
            return;
          }
          send(); // Send all messages.
        })
            .needs(validatorInterest)
            .whenDone(reason => {
              if (reason !== dontRemove) {
                validatorInterest.off(reason);
              }
              if (validatorMessages.delete(validator)) {
                // Send all messages only if the removed validator reported some messages earlier
                send();
              }
            });

        resultInterest.whenDone(() => interest.off(dontRemove));
      };

      // Enable each validator
      for (const [validator, validatorInterest] of validators.entries()) {
        validate(validator, validatorInterest);
      }

      // Enable message sending
      send = () => {
        emitter.send(...allMessages());
      };

      // Send messages if present already
      if (validatorMessages.size) {
        send();
      }

      return resultInterest;
    }).share();

    this.from = validator => {

      const source = controlValidator(control, validator);
      const validatorInterest = eventInterest(() => {
        validators.delete(source);
      });

      validators.set(source, validatorInterest);
      validate(source, validatorInterest); // Start validation using validator

      return validatorInterest;
    };

    function *allMessages(): Iterable<InValidation.Message> {
      for (const messages of validatorMessages.values()) {
        yield *messages;
      }
    }
  }

}

function controlValidator<Value>(
    control: InControl<Value>,
    validator: InValidator<Value>
): AfterEvent<InValidation.Message[]> {
  if (isEventKeeper(validator)) {
    return afterEventFrom(validator);
  }
  if (typeof validator === 'function') {
    return afterEventFrom(validator(control));
  }

  return control.read.keep.thru(simpleValidator(control, validator));
}

function simpleValidator<Value>(
    control: InControl<Value>,
    validator: InValidator.Simple<Value>,
): <NextReturn>(value: Value) => NextArgs<InValidation.Message[], NextReturn> | InValidation.Message {
  return <NextReturn>() => {

    const messages = validator.validate(control);

    return messages == null
        ? nextArgs()
        : Array.isArray(messages)
            ? nextArgs(...messages)
            : messages;
  };
}
