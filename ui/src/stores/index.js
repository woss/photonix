import { combineReducers } from 'redux'
import layout from './layout'
import libraries from './libraries'
import photos from './photos'
import isTagUpdated from "./tag";

const reducers = combineReducers({
  layout,
  libraries,
  photos,
  isTagUpdated,
})

export default reducers
