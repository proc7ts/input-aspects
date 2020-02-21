/**
 * @packageDocumentation
 * @module input-aspects
 */
import { nextArgs } from 'call-thru';
import { afterAll, AfterEvent } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrBuild } from '../aspect.impl';
import { InControl } from '../control';
import { InMode } from './mode.aspect';

/**
 * A data aspect of the input.
 *
 * Represents input control data that will be submitted.
 *
 * Input data is typically the same as control value with respect to {@link InMode input mode}. I.e. when input mode is
 * `off` the data is `undefined`.
 *
 * An aspect interface is an `AfterEvent` keeper of input data.
 *
 * @category Aspect
 * @typeparam Value  Input value type.
 */
export type InData<Value> = AfterEvent<[InData.DataType<Value>?]>;

/**
 * @internal
 */
const InData__aspect: Aspect = {

  applyTo<Value>(control: InControl<Value>): Applied<Value> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return inAspectSameOrBuild(control, InData, <V>(ctrl: InControl<V>) => afterAll({
      value: ctrl,
      mode: ctrl.aspect(InMode),
    }).keep.thru(
        ({ value: [value], mode: [mode] }) => InMode.hasData(mode)
            ? nextArgs(value as any)
            : nextArgs(),
    ));
  },

};

/**
 * Input data aspect.
 */
interface Aspect extends InAspect<InData<any>, 'data'> {

  applyTo<Value>(control: InControl<Value>): Applied<Value>;

}

/**
 * An input data aspect applied to control.
 */
interface Applied<Value> extends InAspect.Applied<Value, InData<Value>, InData<any>> {

  convertTo<To>(target: InControl<To>): Applied<To> | undefined;

}

export const InData = {

  get [InAspect__symbol](): InAspect<InData<any>, 'data'> {
    return InData__aspect;
  },

};

/**
 * @category Aspect
 */
export namespace InData {

  /**
   * Input data type.
   *
   * This is either a partial value (for the object), or the value itself (for everything else).
   *
   * @typeparam Value  Input value type.
   */
  export type DataType<Value> =
      | (Value extends object ? { [K in keyof Value]?: DataType<Value[K]> } : Value)
      | undefined;

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input data aspect application type.
       */
      data(): InData<OfValue>;

    }

  }

}
