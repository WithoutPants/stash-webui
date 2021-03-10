import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Button,
  Dropdown,
  DropdownButton,
  Form,
  Col,
  Row,
} from "react-bootstrap";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import {
  queryScrapeGallery,
  queryScrapeGalleryURL,
  useGalleryCreate,
  useGalleryUpdate,
  useListGalleryScrapers,
  mutateReloadScrapers,
} from "src/core/StashService";
import {
  PerformerSelect,
  TagSelect,
  SceneSelect,
  StudioSelect,
  Icon,
  LoadingIndicator,
} from "src/components/Shared";
import { useToast } from "src/hooks";
import { FormUtils, EditableTextUtils, TextUtils } from "src/utils";
import { RatingStars } from "src/components/Scenes/SceneDetails/RatingStars";
import { GalleryScrapeDialog } from "./GalleryScrapeDialog";

interface IProps {
  isVisible: boolean;
  onDelete: () => void;
}

interface INewProps {
  isNew: true;
  gallery: undefined;
}

interface IExistingProps {
  isNew: false;
  gallery: GQL.GalleryDataFragment;
}

export const GalleryEditPanel: React.FC<
  IProps & (INewProps | IExistingProps)
> = ({ gallery, isNew, isVisible, onDelete }) => {
  const Toast = useToast();
  const history = useHistory();
  const [title, setTitle] = useState<string>(gallery?.title ?? "");
  const [details, setDetails] = useState<string>(gallery?.details ?? "");
  const [url, setUrl] = useState<string>(gallery?.url ?? "");
  const [date, setDate] = useState<string>(gallery?.date ?? "");
  const [rating, setRating] = useState<number>(gallery?.rating ?? NaN);
  const [studioId, setStudioId] = useState<string | undefined>(
    gallery?.studio?.id ?? undefined
  );
  const [performerIds, setPerformerIds] = useState<string[]>(
    gallery?.performers.map((p) => p.id) ?? []
  );
  const [tagIds, setTagIds] = useState<string[]>(
    gallery?.tags.map((t) => t.id) ?? []
  );
  const [scenes, setScenes] = useState<{ id: string; title: string }[]>(
    gallery?.scenes.map((s) => ({
      id: s.id,
      title: s.title ?? TextUtils.fileNameFromPath(s.path ?? ""),
    })) ?? []
  );

  const Scrapers = useListGalleryScrapers();
  const [queryableScrapers, setQueryableScrapers] = useState<GQL.Scraper[]>([]);

  const [
    scrapedGallery,
    setScrapedGallery,
  ] = useState<GQL.ScrapedGallery | null>();

  // Network state
  const [isLoading, setIsLoading] = useState(false);

  const [createGallery] = useGalleryCreate();
  const [updateGallery] = useGalleryUpdate();

  useEffect(() => {
    if (isVisible) {
      Mousetrap.bind("s s", () => {
        onSave();
      });
      Mousetrap.bind("d d", () => {
        onDelete();
      });

      // numeric keypresses get caught by jwplayer, so blur the element
      // if the rating sequence is started
      Mousetrap.bind("r", () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        Mousetrap.bind("0", () => setRating(NaN));
        Mousetrap.bind("1", () => setRating(1));
        Mousetrap.bind("2", () => setRating(2));
        Mousetrap.bind("3", () => setRating(3));
        Mousetrap.bind("4", () => setRating(4));
        Mousetrap.bind("5", () => setRating(5));

        setTimeout(() => {
          Mousetrap.unbind("0");
          Mousetrap.unbind("1");
          Mousetrap.unbind("2");
          Mousetrap.unbind("3");
          Mousetrap.unbind("4");
          Mousetrap.unbind("5");
        }, 1000);
      });

      return () => {
        Mousetrap.unbind("s s");
        Mousetrap.unbind("d d");

        Mousetrap.unbind("r");
      };
    }
  });

  useEffect(() => {
    const newQueryableScrapers = (
      Scrapers?.data?.listGalleryScrapers ?? []
    ).filter((s) =>
      s.gallery?.supported_scrapes.includes(GQL.ScrapeType.Fragment)
    );

    setQueryableScrapers(newQueryableScrapers);
  }, [Scrapers]);

  function getGalleryInput() {
    return {
      id: isNew ? undefined : gallery?.id ?? "",
      title: title ?? "",
      details,
      url,
      date,
      rating: rating ?? null,
      studio_id: studioId ?? null,
      performer_ids: performerIds,
      tag_ids: tagIds,
      scene_ids: scenes.map((s) => s.id),
    };
  }

  async function onSave() {
    setIsLoading(true);
    try {
      if (isNew) {
        const result = await createGallery({
          variables: {
            input: getGalleryInput(),
          },
        });
        if (result.data?.galleryCreate) {
          history.push(`/galleries/${result.data.galleryCreate.id}`);
          Toast.success({ content: "Created gallery" });
        }
      } else {
        const result = await updateGallery({
          variables: {
            input: getGalleryInput() as GQL.GalleryUpdateInput,
          },
        });
        if (result.data?.galleryUpdate) {
          Toast.success({ content: "Updated gallery" });
        }
      }
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);
  }

  async function onScrapeClicked(scraper: GQL.Scraper) {
    setIsLoading(true);
    try {
      const galleryInput = getGalleryInput() as GQL.GalleryUpdateInput;
      const result = await queryScrapeGallery(scraper.id, galleryInput);
      if (!result.data || !result.data.scrapeGallery) {
        Toast.success({
          content: "No galleries found",
        });
        return;
      }
      setScrapedGallery(result.data.scrapeGallery);
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function onReloadScrapers() {
    setIsLoading(true);
    try {
      await mutateReloadScrapers();

      // reload the performer scrapers
      await Scrapers.refetch();
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function onScrapeDialogClosed(data?: GQL.ScrapedGalleryDataFragment) {
    if (data) {
      updateGalleryFromScrapedGallery(data);
    }
    setScrapedGallery(undefined);
  }

  function maybeRenderScrapeDialog() {
    if (!scrapedGallery) {
      return;
    }

    const currentGallery = getGalleryInput();

    return (
      <GalleryScrapeDialog
        gallery={currentGallery}
        scraped={scrapedGallery}
        onClose={(data) => {
          onScrapeDialogClosed(data);
        }}
      />
    );
  }

  function renderScraperMenu() {
    if (isNew) {
      return;
    }

    return (
      <DropdownButton
        className="d-inline-block"
        id="gallery-scrape"
        title="Scrape with..."
      >
        {queryableScrapers.map((s) => (
          <Dropdown.Item key={s.name} onClick={() => onScrapeClicked(s)}>
            {s.name}
          </Dropdown.Item>
        ))}
        <Dropdown.Item onClick={() => onReloadScrapers()}>
          <span className="fa-icon">
            <Icon icon="sync-alt" />
          </span>
          <span>Reload scrapers</span>
        </Dropdown.Item>
      </DropdownButton>
    );
  }

  function urlScrapable(scrapedUrl: string): boolean {
    return (Scrapers?.data?.listGalleryScrapers ?? []).some((s) =>
      (s?.gallery?.urls ?? []).some((u) => scrapedUrl.includes(u))
    );
  }

  function updateGalleryFromScrapedGallery(
    galleryData: GQL.ScrapedGalleryDataFragment
  ) {
    if (galleryData.title) {
      setTitle(galleryData.title);
    }

    if (galleryData.details) {
      setDetails(galleryData.details);
    }

    if (galleryData.date) {
      setDate(galleryData.date);
    }

    if (galleryData.url) {
      setUrl(galleryData.url);
    }

    if (galleryData.studio?.stored_id) {
      setStudioId(galleryData.studio.stored_id);
    }

    if (galleryData.performers?.length) {
      const idPerfs = galleryData.performers.filter((p) => {
        return p.stored_id !== undefined && p.stored_id !== null;
      });

      if (idPerfs.length > 0) {
        const newIds = idPerfs.map((p) => p.stored_id);
        setPerformerIds(newIds as string[]);
      }
    }

    if (galleryData?.tags?.length) {
      const idTags = galleryData.tags.filter((t) => {
        return t.stored_id !== undefined && t.stored_id !== null;
      });

      if (idTags.length > 0) {
        const newIds = idTags.map((t) => t.stored_id);
        setTagIds(newIds as string[]);
      }
    }
  }

  async function onScrapeGalleryURL() {
    if (!url) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await queryScrapeGalleryURL(url);
      if (!result || !result.data || !result.data.scrapeGalleryURL) {
        return;
      }
      setScrapedGallery(result.data.scrapeGalleryURL);
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function maybeRenderScrapeButton() {
    if (!url || !urlScrapable(url)) {
      return undefined;
    }
    return (
      <Button
        className="minimal scrape-url-button"
        onClick={onScrapeGalleryURL}
        title="Scrape"
      >
        <Icon className="fa-fw" icon="file-download" />
      </Button>
    );
  }

  if (isLoading) return <LoadingIndicator />;

  return (
    <div id="gallery-edit-details">
      {maybeRenderScrapeDialog()}
      <div className="form-container row px-3 pt-3">
        <div className="col edit-buttons mb-3 pl-0">
          <Button className="edit-button" variant="primary" onClick={onSave}>
            Save
          </Button>
          <Button
            className="edit-button"
            variant="danger"
            onClick={() => onDelete()}
          >
            Delete
          </Button>
        </div>
        <Col xs={6} className="text-right">
          {renderScraperMenu()}
        </Col>
      </div>
      <div className="form-container row px-3">
        <div className="col-12 col-lg-6 col-xl-12">
          {FormUtils.renderInputGroup({
            title: "Title",
            value: title,
            onChange: setTitle,
            isEditing: true,
          })}
          <Form.Group controlId="url" as={Row}>
            <Col xs={3} className="pr-0 url-label">
              <Form.Label className="col-form-label">URL</Form.Label>
              <div className="float-right scrape-button-container">
                {maybeRenderScrapeButton()}
              </div>
            </Col>
            <Col xs={9}>
              {EditableTextUtils.renderInputGroup({
                title: "URL",
                value: url,
                onChange: setUrl,
                isEditing: true,
              })}
            </Col>
          </Form.Group>
          {FormUtils.renderInputGroup({
            title: "Date",
            value: date,
            isEditing: true,
            onChange: setDate,
            placeholder: "YYYY-MM-DD",
          })}
          <Form.Group controlId="rating" as={Row}>
            {FormUtils.renderLabel({
              title: "Rating",
            })}
            <Col xs={9}>
              <RatingStars
                value={rating}
                onSetRating={(value) => setRating(value ?? NaN)}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="studio" as={Row}>
            {FormUtils.renderLabel({
              title: "Studio",
            })}
            <Col xs={9}>
              <StudioSelect
                onSelect={(items) =>
                  setStudioId(items.length > 0 ? items[0]?.id : undefined)
                }
                ids={studioId ? [studioId] : []}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="performers" as={Row}>
            {FormUtils.renderLabel({
              title: "Performers",
              labelProps: {
                column: true,
                sm: 3,
                xl: 12,
              },
            })}
            <Col sm={9} xl={12}>
              <PerformerSelect
                isMulti
                onSelect={(items) =>
                  setPerformerIds(items.map((item) => item.id))
                }
                ids={performerIds}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="tags" as={Row}>
            {FormUtils.renderLabel({
              title: "Tags",
              labelProps: {
                column: true,
                sm: 3,
                xl: 12,
              },
            })}
            <Col sm={9} xl={12}>
              <TagSelect
                isMulti
                onSelect={(items) => setTagIds(items.map((item) => item.id))}
                ids={tagIds}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="scenes" as={Row}>
            {FormUtils.renderLabel({
              title: "Scenes",
              labelProps: {
                column: true,
                sm: 3,
                xl: 12,
              },
            })}
            <Col sm={9} xl={12}>
              <SceneSelect
                scenes={scenes}
                onSelect={(items) => setScenes(items)}
              />
            </Col>
          </Form.Group>
        </div>
        <div className="col-12 col-lg-6 col-xl-12">
          <Form.Group controlId="details">
            <Form.Label>Details</Form.Label>
            <Form.Control
              as="textarea"
              className="gallery-description text-input"
              onChange={(newValue: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDetails(newValue.currentTarget.value)
              }
              value={details}
            />
          </Form.Group>
        </div>
      </div>
    </div>
  );
};
