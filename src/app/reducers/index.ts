import { RouterState } from "connected-react-router";
import { combineReducers } from "redux";
import * as fromBookshelves from "./bookshelves";
import { error, loading } from "./common";
import * as fromLoading from "./common";
import { router } from "./history";
import { user } from "./user";
import { Bookshelf } from "../models/google-bookshelves";
import { Volume } from "../models/google-volumes";
import { User } from "../models/user";
import * as fromDrive from "./drive";

export type State = {
  user: User;
  router: RouterState;
  loading: { [key: string]: boolean };
  error: { [key: string]: boolean };
  bookshelves: fromBookshelves.BookshelvesState;
  drive: fromDrive.DriveState;
};

export const rootReducer = combineReducers({
  user,
  router,
  loading,
  error,
  bookshelves: fromBookshelves.bookshelves,
  drive: fromDrive.drive
});

export const getUpdateState = ({ loading, error }: State, ids: string[]) => ({
  isLoading: fromLoading.getIsLoading(loading, ids),
  isError: fromLoading.getIsError(error, ids)
});

export const getBookshelves = ({ bookshelves }: State): Bookshelf[] =>
  fromBookshelves.getBookshelves(bookshelves);

export const getBookshelfById = (
  { bookshelves }: State,
  id: string
): Bookshelf => fromBookshelves.getBookshelfById(bookshelves, id);

export const getVolumesByBookshelfId = (
  { bookshelves }: State,
  id: string
): Volume[] => fromBookshelves.getVolumesByBookshelfId(bookshelves, id);

export const getVolumeById = (id: string) => ({ bookshelves }: State) =>
  fromBookshelves.getVolumeById(bookshelves, id);

export const getRootFolder = ({ drive }: State) =>
  fromDrive.getRootFolder(drive);

export const getVolumeFolderById = ({ drive }: State, id: string) =>
  fromDrive.getVolumeFolderById(drive, id);
