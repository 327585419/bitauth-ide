import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import LogRocket from 'logrocket';
import { rootReducer } from './reducer';
// TODO: async, use: https://github.com/redux-loop/redux-loop

export { Provider };

export const configureStore = () => {
  const store = createStore(
    rootReducer,
    composeWithDevTools(applyMiddleware(LogRocket.reduxMiddleware()))
  );

  /**
   * TODO: something isn't working here – changes to the root reducer still
   * cause a full page reload.
   */
  if (process.env.NODE_ENV === 'development') {
    if (module.hot) {
      module.hot.accept('./reducer', () => {
        store.replaceReducer(rootReducer);
      });
    }
  }
  return store;
};
