import { Dispatch } from 'redux';

/**
 * @private
 * A generic async function type.
 */
type AsyncFunction<> = () => Promise<any>

/**
 * @private
 * An action payload with a promise and an optimistic update.
 */
type AsyncPayload = {
  promise: Promise<any> & AsyncFunction;
  data?: any;
}

/**
 * @private
 * The promise action types.
 */
interface Types {
  readonly pending: string;
  readonly fulfilled: string;
  readonly rejected: string;
}

/**
 * @private
 * A generic action interface, according to Flux Standard Action (FSA).
 */
interface Action {
  readonly type: string;
  readonly payload?: object;
  readonly meta?: object;
  readonly error?: boolean;
}

interface FulfilledAction extends Action {
  readonly error?: never;
}

interface RejectedAction extends Action {
  readonly payload: Error;
  readonly error: true;
}

/**
 * @private
 * An async action interface.
 */
interface AsyncAction extends Action {
  readonly payload?: Promise<any> & AsyncFunction & AsyncPayload;
}

/**
 * @private
 * The middleware configuration interface.
 */
interface Config {
  readonly types?: Types,
  readonly typeDelimiter?: string,
}

/**
 * @private
 * The defaults for the promise action types.
 */
enum DefaultTypes {
  pending = 'PENDING',
  fulfilled ='FULFILLED',
  rejected = 'REJECTED',
}


/**
* @private 
* @name isPromise
* @returns True when the value is a promise and false when
* the value is not a promise
*/
export function isPromise(value: any): boolean {
  return value !== null && typeof value === 'object' && typeof value.then === 'function';
}

/**
* @private
*/
export const destructureAction = ({ payload }: AsyncAction): { promise: Promise<any>, data?: any } => {
  let promise: Promise<any> = null;
  let data: any = null;

  if (isPromise(payload)) {
    promise = payload;
  }

  else if (typeof payload === 'function') {
    promise = payload();
  }

  else if (typeof payload === 'object') {
    data = payload.data;

    // For async functions...
    if (typeof payload.promise === 'function') {
      promise = payload.promise();
    }

    // For promise objects...
    if (isPromise(payload.promise)) {
      promise = payload.promise;
    }
  }

  return { promise, data };
}

/**
 * @private
 * Constructs and returns a rejected or fulfilled action object.
 */
export const createAction = ({ asyncType, asyncTypeDelimiter, ...action }): Action => {
  console.log('payload', action.payload)

  return {
    // Action type property
    type: [action.type, asyncType].join(asyncTypeDelimiter),

    // Action payload property
    ...((action.payload === null || typeof action.payload === 'undefined') ? {} : {
      payload: action.payload
    }),

    // Meta property
    ...(action.meta !== undefined ? {
      meta: action.meta
    } : {}),

    // Error property (for rejected actions only)
    ...(action.error ? {
      error: action.error
    } : {})
  };
}

/**
 * @public 
 * @description Use to create Redux promise middleware with a custom configuration.
 */
export function createPromise(config: Config = { types: DefaultTypes, typeDelimiter: '_' })  {
  const { types, typeDelimiter } = config;
  
  return ({ dispatch }: { dispatch: Dispatch }) => (next) => (action: AsyncAction) => {
    /**
     * STEP 1
     * Attempt to get a promise out of the dispatched action object.
     */
    const { promise, data } = destructureAction(action);

    /**
     * STEP 2
     * If there is no promise, or if the promise is nested, move on.
     */
    if (isPromise(promise)) {
      return next({
        ...action,
        payload: promise,
      });
    } else if (!promise) {
      return next(action);
    }

    /**
     * STEP 3
     * @description Constructy and dispatch the pending action.
     * @remarks This object describes the pending state of a promise and 
     * will include any data (for optimistic updates) and/or meta from the
     * original action.
     */
    next(createAction({
      type: action.type,
      payload: data,
      meta: action.meta,
      error: false,
      asyncType: types.pending,
      asyncTypeDelimiter: typeDelimiter,
    }));

    /** 
     * STEP 4 
     * @description When the promise settles, construct and dispatch one
     * of the fulfilled or rejected side-effect actions.
     */ 
    return promise.then(
      (value: any): any => {
        const fulfilledAction = createAction({
          type: action.type,
          payload: value,
          meta: action.meta,
          error: false,
          asyncType: types.fulfilled,
          asyncTypeDelimiter: typeDelimiter,
        });
        
        dispatch(fulfilledAction);

        return { value, action: fulfilledAction };
      },
      (error: Error): never => {
        const rejectedAction = createAction({
          type: action.type,
          payload: error,
          meta: action.meta,
          error: true,
          asyncType: types.rejected,
          asyncTypeDelimiter: typeDelimiter,
        })

        dispatch(rejectedAction);

        throw error;
      }
    );
  };
}

/**
 * @public promise
 * @description Use to get Redux promise middleware with a default configuration.
 */
export default function middleware({ dispatch }: { dispatch: Dispatch }) {
  if (typeof dispatch === 'function') {
    return createPromise()({ dispatch });
  }

  if (process && process.env && process.env.NODE_ENV === 'development') {
    console.log(`[REDUX PROMISE MIDDLEWARE]: As of version 6.0.0, the middleware library\ 
    \\supports both preconfigured and custom configured middleware. To use a custom\ 
    \\configuration, use the "createPromise" export and call this function with your\ 
    \\configuration property. To use a preconfiguration, use the default export.\
    \\For more help, check the upgrading guide:\ 
    \\https://docs.psb.codes/redux-promise-middleware/upgrade-guides/v6
    \n
    \\For custom configuration:\
    \\import { createPromise } from 'redux-promise-middleware';\
    \\const promise = createPromise({ types: { fulfilled: 'success' } });\
    \\applyMiddleware(promise);\
    \n
    \\For preconfiguration:\
    \\import promise from 'redux-promise-middleware';\
    \\applyMiddleware(promise);\
    `)
  }

  return null;
}

/**
 * @public ActionTypes
 * @description Use to read the default action types used by the middleware.
 */
export { DefaultTypes as ActionTypes };
