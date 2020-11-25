import React, { useEffect, useState } from "react";
import { Button, Tabs, Tab } from "react-bootstrap";
import { useParams, useHistory } from "react-router-dom";
import cx from "classnames";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import {
  useFindPerformer,
  usePerformerUpdate,
  usePerformerCreate,
  usePerformerDestroy,
} from "src/core/StashService";
import {
  CountryFlag,
  ErrorMessage,
  Icon,
  LoadingIndicator,
} from "src/components/Shared";
import { useToast } from "src/hooks";
import { TextUtils } from "src/utils";
import FsLightbox from "fslightbox-react";
import { PerformerDetailsPanel } from "./PerformerDetailsPanel";
import { PerformerOperationsPanel } from "./PerformerOperationsPanel";
import { PerformerScenesPanel } from "./PerformerScenesPanel";
import { PerformerImagesPanel } from "./PerformerImagesPanel";

interface IPerformerParams {
  id?: string;
  tab?: string;
}

export const Performer: React.FC = () => {
  const Toast = useToast();
  const history = useHistory();
  const { tab = "details", id = "new" } = useParams<IPerformerParams>();
  const isNew = id === "new";

  // Performer state
  const [imagePreview, setImagePreview] = useState<string | null>();
  const [imageEncoding, setImageEncoding] = useState<boolean>(false);
  const [lightboxToggle, setLightboxToggle] = useState(false);
  const { data, loading: performerLoading, error } = useFindPerformer(id);
  const performer = data?.findPerformer || ({} as Partial<GQL.Performer>);

  // if undefined then get the existing image
  // if null then get the default (no) image
  // otherwise get the set image
  const activeImage =
    imagePreview === undefined
      ? performer.image_path ?? ""
      : imagePreview ?? `${performer.image_path}?default=true`;

  // Network state
  const [loading, setIsLoading] = useState(false);
  const isLoading = performerLoading || loading;

  const [updatePerformer] = usePerformerUpdate();
  const [createPerformer] = usePerformerCreate();
  const [deletePerformer] = usePerformerDestroy();

  const activeTabKey =
    tab === "scenes" ||
    tab === "images" ||
    tab === "edit" ||
    tab === "operations"
      ? tab
      : "details";
  const setActiveTabKey = (newTab: string | null) => {
    if (tab !== newTab) {
      const tabParam = newTab === "details" ? "" : `/${newTab}`;
      history.replace(`/performers/${id}${tabParam}`);
    }
  };

  const onImageChange = (image?: string | null) => setImagePreview(image);

  const onImageEncoding = (isEncoding = false) => setImageEncoding(isEncoding);

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind("a", () => setActiveTabKey("details"));
    Mousetrap.bind("e", () => setActiveTabKey("edit"));
    Mousetrap.bind("c", () => setActiveTabKey("scenes"));
    Mousetrap.bind("o", () => setActiveTabKey("operations"));
    Mousetrap.bind("f", () => setFavorite(!performer.favorite));

    return () => {
      Mousetrap.unbind("a");
      Mousetrap.unbind("e");
      Mousetrap.unbind("c");
      Mousetrap.unbind("f");
      Mousetrap.unbind("o");
    };
  });

  if (isLoading) return <LoadingIndicator />;
  if (error) return <ErrorMessage error={error.message} />;
  if (!performer.id && !isNew)
    return <ErrorMessage error={`No performer found with id ${id}.`} />;

  async function onSave(
    performerInput:
      | Partial<GQL.PerformerCreateInput>
      | Partial<GQL.PerformerUpdateInput>
  ) {
    setIsLoading(true);
    try {
      if (!isNew) {
        await updatePerformer({
          variables: {
            ...performerInput,
            stash_ids: (performerInput?.stash_ids ?? []).map((s) => ({
              endpoint: s.endpoint,
              stash_id: s.stash_id,
            })),
          } as GQL.PerformerUpdateInput,
        });
        if (performerInput.image) {
          // Refetch image to bust browser cache
          await fetch(`/performer/${id}/image`, { cache: "reload" });
        }
      } else {
        const result = await createPerformer({
          variables: performerInput as GQL.PerformerCreateInput,
        });
        if (result.data?.performerCreate) {
          history.push(`/performers/${result.data.performerCreate.id}`);
        }
      }
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);
  }

  async function onDelete() {
    setIsLoading(true);
    try {
      await deletePerformer({ variables: { id } });
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);

    // redirect to performers page
    history.push("/performers");
  }

  const renderTabs = () => (
    <Tabs
      activeKey={activeTabKey}
      onSelect={setActiveTabKey}
      id="performer-details"
      unmountOnExit
    >
      <Tab eventKey="details" title="Details">
        <PerformerDetailsPanel
          performer={performer}
          isEditing={false}
          isVisible={activeTabKey === "details"}
        />
      </Tab>
      <Tab eventKey="scenes" title="Scenes">
        <PerformerScenesPanel performer={performer} />
      </Tab>
      <Tab eventKey="images" title="Images">
        <PerformerImagesPanel performer={performer} />
      </Tab>
      <Tab eventKey="edit" title="Edit">
        <PerformerDetailsPanel
          performer={performer}
          isEditing
          isVisible={activeTabKey === "edit"}
          isNew={isNew}
          onDelete={onDelete}
          onSave={onSave}
          onImageChange={onImageChange}
          onImageEncoding={onImageEncoding}
        />
      </Tab>
      <Tab eventKey="operations" title="Operations">
        <PerformerOperationsPanel performer={performer} />
      </Tab>
    </Tabs>
  );

  function maybeRenderAge() {
    if (performer?.birthdate) {
      // calculate the age from birthdate. In future, this should probably be
      // provided by the server
      return (
        <div>
          <span className="age">{TextUtils.age(performer.birthdate)}</span>
          <span className="age-tail"> years old</span>
        </div>
      );
    }
  }

  function maybeRenderAliases() {
    if (performer?.aliases) {
      return (
        <div>
          <span className="alias-head">Also known as </span>
          <span className="alias">{performer.aliases}</span>
        </div>
      );
    }
  }

  function setFavorite(v: boolean) {
    onSave({ ...performer, favorite: v });
  }

  const renderIcons = () => (
    <span className="name-icons">
      <Button
        className={cx(
          "minimal",
          performer.favorite ? "favorite" : "not-favorite"
        )}
        onClick={() => setFavorite(!performer.favorite)}
      >
        <Icon icon="heart" />
      </Button>
      {performer.url && (
        <Button className="minimal">
          <a
            href={TextUtils.sanitiseURL(performer.url)}
            className="link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="link" />
          </a>
        </Button>
      )}
      {performer.twitter && (
        <Button className="minimal">
          <a
            href={TextUtils.sanitiseURL(
              performer.twitter,
              TextUtils.twitterURL
            )}
            className="twitter"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="dove" />
          </a>
        </Button>
      )}
      {performer.instagram && (
        <Button className="minimal">
          <a
            href={TextUtils.sanitiseURL(
              performer.instagram,
              TextUtils.instagramURL
            )}
            className="instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="camera" />
          </a>
        </Button>
      )}
    </span>
  );

  function renderPerformerImage() {
    if (imageEncoding) {
      return <LoadingIndicator message="Encoding image..." />;
    }
    if (activeImage) {
      return <img className="photo" src={activeImage} alt="Performer" />;
    }
  }

  if (isNew)
    return (
      <div className="row new-view">
        <div className="col-4">{renderPerformerImage()}</div>
        <div className="col-6">
          <h2>Create Performer</h2>
          <PerformerDetailsPanel
            performer={performer}
            isEditing
            isVisible
            isNew={isNew}
            onDelete={onDelete}
            onSave={onSave}
            onImageChange={onImageChange}
            onImageEncoding={onImageEncoding}
          />
        </div>
      </div>
    );

  if (!performer.id) {
    return <LoadingIndicator />;
  }

  return (
    <div id="performer-page" className="row">
      <div className="performer-image-container col-md-4 text-center">
        {imageEncoding ? (
          <LoadingIndicator message="Encoding image..." />
        ) : (
          <Button
            variant="link"
            onClick={() => setLightboxToggle(!lightboxToggle)}
          >
            <img className="performer" src={activeImage} alt="Performer" />
          </Button>
        )}
      </div>
      <div className="col-md-8">
        <div className="row">
          <div className="performer-head col">
            <h2>
              <CountryFlag country={performer.country} className="mr-2" />
              {performer.name}
              {renderIcons()}
            </h2>
            {maybeRenderAliases()}
            {maybeRenderAge()}
          </div>
        </div>
        <div className="performer-body">
          <div className="performer-tabs">{renderTabs()}</div>
        </div>
      </div>
      <FsLightbox toggler={lightboxToggle} sources={[activeImage]} />
    </div>
  );
};
