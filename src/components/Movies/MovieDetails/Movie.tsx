import React, { useEffect, useState, useCallback } from "react";
import { useIntl } from "react-intl";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import {
  useFindMovie,
  useMovieUpdate,
  useMovieCreate,
  useMovieDestroy,
  queryScrapeMovieURL,
  useListMovieScrapers,
} from "src/core/StashService";
import { useParams, useHistory } from "react-router-dom";
import {
  DetailsEditNavbar,
  LoadingIndicator,
  Modal,
  StudioSelect,
  Icon,
} from "src/components/Shared";
import { useToast } from "src/hooks";
import { Table, Form, Modal as BSModal, Button } from "react-bootstrap";
import {
  TableUtils,
  ImageUtils,
  EditableTextUtils,
  TextUtils,
  DurationUtils,
} from "src/utils";
import { RatingStars } from "src/components/Scenes/SceneDetails/RatingStars";
import { MovieScenesPanel } from "./MovieScenesPanel";
import { MovieScrapeDialog } from "./MovieScrapeDialog";

interface IMovieParams {
  id?: string;
}

export const Movie: React.FC = () => {
  const history = useHistory();
  const Toast = useToast();
  const { id = "new" } = useParams<IMovieParams>();
  const isNew = id === "new";

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(isNew);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [isImageAlertOpen, setIsImageAlertOpen] = useState<boolean>(false);

  // Editing movie state
  const [frontImage, setFrontImage] = useState<string | undefined | null>(
    undefined
  );
  const [backImage, setBackImage] = useState<string | undefined | null>(
    undefined
  );
  const [name, setName] = useState<string | undefined>(undefined);
  const [aliases, setAliases] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [studioId, setStudioId] = useState<string>();
  const [director, setDirector] = useState<string | undefined>(undefined);
  const [synopsis, setSynopsis] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState<string | undefined>(undefined);

  // Movie state
  const [movie, setMovie] = useState<Partial<GQL.MovieDataFragment>>({});
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined
  );
  const [backimagePreview, setBackImagePreview] = useState<string | undefined>(
    undefined
  );

  const [imageClipboard, setImageClipboard] = useState<string | undefined>(
    undefined
  );

  // Network state
  const { data, error, loading } = useFindMovie(id);
  const [isLoading, setIsLoading] = useState(false);
  const [updateMovie] = useMovieUpdate(getMovieInput() as GQL.MovieUpdateInput);
  const [createMovie] = useMovieCreate(getMovieInput() as GQL.MovieCreateInput);
  const [deleteMovie] = useMovieDestroy(
    getMovieInput() as GQL.MovieDestroyInput
  );

  const Scrapers = useListMovieScrapers();
  const [scrapedMovie, setScrapedMovie] = useState<
    GQL.ScrapedMovie | undefined
  >();

  const intl = useIntl();

  // set up hotkeys
  useEffect(() => {
    if (isEditing) {
      Mousetrap.bind("r 0", () => setRating(NaN));
      Mousetrap.bind("r 1", () => setRating(1));
      Mousetrap.bind("r 2", () => setRating(2));
      Mousetrap.bind("r 3", () => setRating(3));
      Mousetrap.bind("r 4", () => setRating(4));
      Mousetrap.bind("r 5", () => setRating(5));
      // Mousetrap.bind("u", (e) => {
      //   setStudioFocus()
      //   e.preventDefault();
      // });
      Mousetrap.bind("s s", () => onSave());
    }

    Mousetrap.bind("e", () => setIsEditing(true));
    Mousetrap.bind("d d", () => onDelete());

    return () => {
      if (isEditing) {
        Mousetrap.unbind("r 0");
        Mousetrap.unbind("r 1");
        Mousetrap.unbind("r 2");
        Mousetrap.unbind("r 3");
        Mousetrap.unbind("r 4");
        Mousetrap.unbind("r 5");
        // Mousetrap.unbind("u");
        Mousetrap.unbind("s s");
      }

      Mousetrap.unbind("e");
      Mousetrap.unbind("d d");
    };
  });

  function updateMovieEditState(state: Partial<GQL.MovieDataFragment>) {
    setName(state.name ?? undefined);
    setAliases(state.aliases ?? undefined);
    setDuration(state.duration ?? undefined);
    setDate(state.date ?? undefined);
    setRating(state.rating ?? undefined);
    setStudioId(state?.studio?.id ?? undefined);
    setDirector(state.director ?? undefined);
    setSynopsis(state.synopsis ?? undefined);
    setUrl(state.url ?? undefined);
  }

  const updateMovieData = useCallback(
    (movieData: Partial<GQL.MovieDataFragment>) => {
      setFrontImage(undefined);
      setBackImage(undefined);
      updateMovieEditState(movieData);
      setImagePreview(movieData.front_image_path ?? undefined);
      setBackImagePreview(movieData.back_image_path ?? undefined);
      setMovie(movieData);
    },
    []
  );

  useEffect(() => {
    if (data && data.findMovie) {
      updateMovieData(data.findMovie);
    }
  }, [data, updateMovieData]);

  function showImageAlert(imageData: string) {
    setImageClipboard(imageData);
    setIsImageAlertOpen(true);
  }

  function setImageFromClipboard(isFrontImage: boolean) {
    if (isFrontImage) {
      setImagePreview(imageClipboard);
      setFrontImage(imageClipboard);
    } else {
      setBackImagePreview(imageClipboard);
      setBackImage(imageClipboard);
    }

    setImageClipboard(undefined);
    setIsImageAlertOpen(false);
  }

  function onBackImageLoad(imageData: string) {
    setBackImagePreview(imageData);
    setBackImage(imageData);
  }

  function onFrontImageLoad(imageData: string) {
    setImagePreview(imageData);
    setFrontImage(imageData);
  }

  const encodingImage = ImageUtils.usePasteImage(showImageAlert, isEditing);

  if (!isNew && !isEditing) {
    if (!data || !data.findMovie || loading) return <LoadingIndicator />;
    if (error) {
      return <>{error!.message}</>;
    }
  }

  function getMovieInput() {
    const input: Partial<GQL.MovieCreateInput | GQL.MovieUpdateInput> = {
      name,
      aliases,
      duration,
      date,
      rating,
      studio_id: studioId,
      director,
      synopsis,
      url,
      front_image: frontImage,
      back_image: backImage,
    };

    if (!isNew) {
      (input as GQL.MovieUpdateInput).id = id;
    }
    return input;
  }

  async function onSave() {
    try {
      if (!isNew) {
        const result = await updateMovie();
        if (result.data?.movieUpdate) {
          updateMovieData(result.data.movieUpdate);
          setIsEditing(false);
        }
      } else {
        const result = await createMovie();
        if (result.data?.movieCreate?.id) {
          history.push(`/movies/${result.data.movieCreate.id}`);
          setIsEditing(false);
        }
      }
    } catch (e) {
      Toast.error(e);
    }
  }

  async function onDelete() {
    try {
      await deleteMovie();
    } catch (e) {
      Toast.error(e);
    }

    // redirect to movies page
    history.push(`/movies`);
  }

  function onFrontImageChange(event: React.FormEvent<HTMLInputElement>) {
    ImageUtils.onImageChange(event, onFrontImageLoad);
  }

  function onBackImageChange(event: React.FormEvent<HTMLInputElement>) {
    ImageUtils.onImageChange(event, onBackImageLoad);
  }

  function onToggleEdit() {
    setIsEditing(!isEditing);
    updateMovieData(movie);
  }

  function renderDeleteAlert() {
    return (
      <Modal
        show={isDeleteAlertOpen}
        icon="trash-alt"
        accept={{ text: "Delete", variant: "danger", onClick: onDelete }}
        cancel={{ onClick: () => setIsDeleteAlertOpen(false) }}
      >
        <p>Are you sure you want to delete {name ?? "movie"}?</p>
      </Modal>
    );
  }

  function renderImageAlert() {
    return (
      <BSModal
        show={isImageAlertOpen}
        onHide={() => setIsImageAlertOpen(false)}
      >
        <BSModal.Body>
          <p>Select image to set</p>
        </BSModal.Body>
        <BSModal.Footer>
          <div>
            <Button
              className="mr-2"
              variant="secondary"
              onClick={() => setIsImageAlertOpen(false)}
            >
              Cancel
            </Button>

            <Button
              className="mr-2"
              onClick={() => setImageFromClipboard(false)}
            >
              Back Image
            </Button>
            <Button
              className="mr-2"
              onClick={() => setImageFromClipboard(true)}
            >
              Front Image
            </Button>
          </div>
        </BSModal.Footer>
      </BSModal>
    );
  }

  function updateMovieEditStateFromScraper(
    state: Partial<GQL.ScrapedMovieDataFragment>
  ) {
    if (state.name) {
      setName(state.name);
    }

    if (state.aliases) {
      setAliases(state.aliases ?? undefined);
    }

    if (state.duration) {
      setDuration(DurationUtils.stringToSeconds(state.duration) ?? undefined);
    }

    if (state.date) {
      setDate(state.date ?? undefined);
    }

    if (state.studio && state.studio.id) {
      setStudioId(state.studio.id ?? undefined);
    }

    if (state.director) {
      setDirector(state.director ?? undefined);
    }
    if (state.synopsis) {
      setSynopsis(state.synopsis ?? undefined);
    }
    if (state.url) {
      setUrl(state.url ?? undefined);
    }

    // image is a base64 string
    // #404: don't overwrite image if it has been modified by the user
    // overwrite if not new since it came from a dialog
    // otherwise follow existing behaviour
    if (
      (!isNew || frontImage === undefined) &&
      (state as GQL.ScrapedMovieDataFragment).front_image !== undefined
    ) {
      const imageStr = (state as GQL.ScrapedMovieDataFragment).front_image;
      setFrontImage(imageStr ?? undefined);
      setImagePreview(imageStr ?? undefined);
    }

    if (
      (!isNew || backImage === undefined) &&
      (state as GQL.ScrapedMovieDataFragment).back_image !== undefined
    ) {
      const imageStr = (state as GQL.ScrapedMovieDataFragment).back_image;
      setBackImage(imageStr ?? undefined);
      setBackImagePreview(imageStr ?? undefined);
    }
  }

  async function onScrapeMovieURL() {
    if (!url) return;
    setIsLoading(true);

    try {
      const result = await queryScrapeMovieURL(url);
      if (!result.data || !result.data.scrapeMovieURL) {
        return;
      }

      // if this is a new movie, just dump the data
      if (isNew) {
        updateMovieEditStateFromScraper(result.data.scrapeMovieURL);
      } else {
        setScrapedMovie(result.data.scrapeMovieURL);
      }
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function urlScrapable(scrapedUrl: string) {
    return (
      !!scrapedUrl &&
      (Scrapers?.data?.listMovieScrapers ?? []).some((s) =>
        (s?.movie?.urls ?? []).some((u) => scrapedUrl.includes(u))
      )
    );
  }

  function maybeRenderScrapeButton() {
    if (!url || !isEditing || !urlScrapable(url)) {
      return undefined;
    }
    return (
      <Button
        className="minimal scrape-url-button"
        onClick={() => onScrapeMovieURL()}
      >
        <Icon icon="file-upload" />
      </Button>
    );
  }

  function maybeRenderScrapeDialog() {
    if (!scrapedMovie) {
      return;
    }

    const currentMovie = getMovieInput();

    // Get image paths for scrape gui
    currentMovie.front_image = movie.front_image_path;
    currentMovie.back_image = movie.back_image_path;

    return (
      <MovieScrapeDialog
        movie={currentMovie}
        scraped={scrapedMovie}
        onClose={(m) => {
          onScrapeDialogClosed(m);
        }}
      />
    );
  }

  function onScrapeDialogClosed(p?: GQL.ScrapedMovieDataFragment) {
    if (p) {
      updateMovieEditStateFromScraper(p);
    }
    setScrapedMovie(undefined);
  }

  function onClearFrontImage() {
    setFrontImage(null);
    setImagePreview(
      movie.front_image_path
        ? `${movie.front_image_path}?default=true`
        : undefined
    );
  }

  function onClearBackImage() {
    setBackImage(null);
    setBackImagePreview(
      movie.back_image_path
        ? `${movie.back_image_path}?default=true`
        : undefined
    );
  }

  if (isLoading) return <LoadingIndicator />;

  // TODO: CSS class
  return (
    <div className="row">
      <div className="movie-details col">
        {isNew && <h2>Add Movie</h2>}
        <div className="logo w-100">
          {encodingImage ? (
            <LoadingIndicator message="Encoding image..." />
          ) : (
            <>
              <img alt={name} className="logo w-50" src={imagePreview} />
              <img alt={name} className="logo w-50" src={backimagePreview} />
            </>
          )}
        </div>

        <Table>
          <tbody>
            {TableUtils.renderInputGroup({
              title: "Name",
              value: name ?? "",
              isEditing: !!isEditing,
              onChange: setName,
            })}
            {TableUtils.renderInputGroup({
              title: "Aliases",
              value: aliases,
              isEditing,
              onChange: setAliases,
            })}
            {TableUtils.renderDurationInput({
              title: "Duration",
              value: duration ? duration.toString() : "",
              isEditing,
              onChange: (value: string | undefined) =>
                setDuration(value ? Number.parseInt(value, 10) : undefined),
            })}
            {TableUtils.renderInputGroup({
              title: `Date ${isEditing ? "(YYYY-MM-DD)" : ""}`,
              value: isEditing ? date : TextUtils.formatDate(intl, date),
              isEditing,
              onChange: setDate,
            })}
            <tr>
              <td>Studio</td>
              <td>
                <StudioSelect
                  isDisabled={!isEditing}
                  onSelect={(items) =>
                    setStudioId(items.length > 0 ? items[0]?.id : undefined)
                  }
                  ids={studioId ? [studioId] : []}
                />
              </td>
            </tr>
            {TableUtils.renderInputGroup({
              title: "Director",
              value: director,
              isEditing,
              onChange: setDirector,
            })}
            <tr>
              <td>Rating</td>
              <td>
                <RatingStars
                  value={rating}
                  disabled={!isEditing}
                  onSetRating={(value) => setRating(value)}
                />
              </td>
            </tr>
          </tbody>
        </Table>

        <Form.Group controlId="url">
          <Form.Label>URL {maybeRenderScrapeButton()}</Form.Label>
          <div>
            {EditableTextUtils.renderInputGroup({
              isEditing,
              onChange: setUrl,
              value: url,
              url: TextUtils.sanitiseURL(url),
            })}
          </div>
        </Form.Group>

        <Form.Group controlId="synopsis">
          <Form.Label>Synopsis</Form.Label>
          <Form.Control
            as="textarea"
            readOnly={!isEditing}
            className="movie-synopsis text-input"
            onChange={(newValue: React.ChangeEvent<HTMLTextAreaElement>) =>
              setSynopsis(newValue.currentTarget.value)
            }
            value={synopsis}
          />
        </Form.Group>

        <DetailsEditNavbar
          objectName={name ?? "movie"}
          isNew={isNew}
          isEditing={isEditing}
          onToggleEdit={onToggleEdit}
          onSave={onSave}
          onImageChange={onFrontImageChange}
          onClearImage={onClearFrontImage}
          onBackImageChange={onBackImageChange}
          onClearBackImage={onClearBackImage}
          onDelete={onDelete}
        />
      </div>
      {!isNew && (
        <div className="col-lg-8 col-md-7">
          <MovieScenesPanel movie={movie} />
        </div>
      )}
      {renderDeleteAlert()}
      {renderImageAlert()}
      {maybeRenderScrapeDialog()}
    </div>
  );
};
