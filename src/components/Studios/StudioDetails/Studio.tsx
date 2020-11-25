import { Table, Tabs, Tab } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import { useParams, useHistory, Link } from "react-router-dom";
import cx from "classnames";
import Mousetrap from "mousetrap";

import * as GQL from "src/core/generated-graphql";
import {
  useFindStudio,
  useStudioUpdate,
  useStudioCreate,
  useStudioDestroy,
  mutateMetadataAutoTag,
} from "src/core/StashService";
import { ImageUtils, TableUtils } from "src/utils";
import {
  DetailsEditNavbar,
  Modal,
  LoadingIndicator,
  StudioSelect,
} from "src/components/Shared";
import { useToast } from "src/hooks";
import { StudioScenesPanel } from "./StudioScenesPanel";
import { StudioImagesPanel } from "./StudioImagesPanel";
import { StudioChildrenPanel } from "./StudioChildrenPanel";

interface IStudioParams {
  id?: string;
  tab?: string;
}

export const Studio: React.FC = () => {
  const history = useHistory();
  const Toast = useToast();
  const { tab = "details", id = "new" } = useParams<IStudioParams>();
  const isNew = id === "new";

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(isNew);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);

  // Editing studio state
  const [image, setImage] = useState<string | null>();
  const [name, setName] = useState<string>();
  const [url, setUrl] = useState<string>();
  const [parentStudioId, setParentStudioId] = useState<string>();

  // Studio state
  const [studio, setStudio] = useState<Partial<GQL.StudioDataFragment>>({});
  const [imagePreview, setImagePreview] = useState<string | null>();

  const { data, error, loading } = useFindStudio(id);
  const [updateStudio] = useStudioUpdate(
    getStudioInput() as GQL.StudioUpdateInput
  );
  const [createStudio] = useStudioCreate(
    getStudioInput() as GQL.StudioCreateInput
  );
  const [deleteStudio] = useStudioDestroy(
    getStudioInput() as GQL.StudioDestroyInput
  );

  function updateStudioEditState(state: Partial<GQL.StudioDataFragment>) {
    setName(state.name);
    setUrl(state.url ?? undefined);
    setParentStudioId(state?.parent_studio?.id ?? undefined);
  }

  function updateStudioData(studioData: Partial<GQL.StudioDataFragment>) {
    setImage(undefined);
    updateStudioEditState(studioData);
    setImagePreview(studioData.image_path ?? undefined);
    setStudio(studioData);
  }

  // set up hotkeys
  useEffect(() => {
    if (isEditing) {
      Mousetrap.bind("s s", () => onSave());
    }

    Mousetrap.bind("e", () => setIsEditing(true));
    Mousetrap.bind("d d", () => onDelete());

    return () => {
      if (isEditing) {
        Mousetrap.unbind("s s");
      }

      Mousetrap.unbind("e");
      Mousetrap.unbind("d d");
    };
  });

  useEffect(() => {
    if (data && data.findStudio) {
      setImage(undefined);
      updateStudioEditState(data.findStudio);
      setImagePreview(data.findStudio.image_path ?? undefined);
      setStudio(data.findStudio);
    }
  }, [data]);

  function onImageLoad(imageData: string) {
    setImagePreview(imageData);
    setImage(imageData);
  }

  const imageEncoding = ImageUtils.usePasteImage(onImageLoad, isEditing);

  if (!isNew && !isEditing) {
    if (!data?.findStudio || loading || !studio.id) return <LoadingIndicator />;
    if (error) return <div>{error.message}</div>;
  }

  function getStudioInput() {
    const input: Partial<GQL.StudioCreateInput | GQL.StudioUpdateInput> = {
      name,
      url,
      parent_id: parentStudioId,
      image,
    };

    if (!isNew) {
      (input as GQL.StudioUpdateInput).id = id;
    }
    return input;
  }

  async function onSave() {
    try {
      if (!isNew) {
        const result = await updateStudio();
        if (result.data?.studioUpdate) {
          updateStudioData(result.data.studioUpdate);
          setIsEditing(false);
        }
      } else {
        const result = await createStudio();
        if (result.data?.studioCreate?.id) {
          history.push(`/studios/${result.data.studioCreate.id}`);
          setIsEditing(false);
        }
      }
    } catch (e) {
      Toast.error(e);
    }
  }

  async function onAutoTag() {
    if (!studio.id) return;
    try {
      await mutateMetadataAutoTag({ studios: [studio.id] });
      Toast.success({ content: "Started auto tagging" });
    } catch (e) {
      Toast.error(e);
    }
  }

  async function onDelete() {
    try {
      await deleteStudio();
    } catch (e) {
      Toast.error(e);
    }

    // redirect to studios page
    history.push(`/studios`);
  }

  function onImageChangeHandler(event: React.FormEvent<HTMLInputElement>) {
    ImageUtils.onImageChange(event, onImageLoad);
  }

  function renderDeleteAlert() {
    return (
      <Modal
        show={isDeleteAlertOpen}
        icon="trash-alt"
        accept={{ text: "Delete", variant: "danger", onClick: onDelete }}
        cancel={{ onClick: () => setIsDeleteAlertOpen(false) }}
      >
        <p>Are you sure you want to delete {name ?? "studio"}?</p>
      </Modal>
    );
  }

  function renderStashIDs() {
    if (!studio.stash_ids?.length) {
      return;
    }

    return (
      <tr>
        <td>StashIDs</td>
        <td>
          <ul className="pl-0">
            {studio.stash_ids.map((stashID) => {
              const base = stashID.endpoint.match(/https?:\/\/.*?\//)?.[0];
              const link = base ? (
                <a
                  href={`${base}studios/${stashID.stash_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {stashID.stash_id}
                </a>
              ) : (
                stashID.stash_id
              );
              return (
                <li key={stashID.stash_id} className="row no-gutters">
                  {link}
                </li>
              );
            })}
          </ul>
        </td>
      </tr>
    );
  }

  function onToggleEdit() {
    setIsEditing(!isEditing);
    updateStudioData(studio);
  }

  function onClearImage() {
    setImage(null);
    setImagePreview(
      studio.image_path ? `${studio.image_path}?default=true` : undefined
    );
  }

  const activeTabKey =
    tab === "childstudios" || tab === "images" ? tab : "scenes";
  const setActiveTabKey = (newTab: string | null) => {
    if (tab !== newTab) {
      const tabParam = newTab === "scenes" ? "" : `/${newTab}`;
      history.replace(`/studios/${id}${tabParam}`);
    }
  };

  function renderStudio() {
    if (isEditing || !parentStudioId) {
      return (
        <StudioSelect
          onSelect={(items) =>
            setParentStudioId(items.length > 0 ? items[0]?.id : undefined)
          }
          ids={parentStudioId ? [parentStudioId] : []}
          isDisabled={!isEditing}
        />
      );
    }

    if (studio.parent_studio) {
      return (
        <Link to={`/studios/${studio.parent_studio.id}`}>
          {studio.parent_studio.name}
        </Link>
      );
    }
  }

  return (
    <div className="row">
      <div
        className={cx("studio-details", {
          "col-md-4": !isNew,
          "col-8": isNew,
        })}
      >
        {isNew && <h2>Add Studio</h2>}
        <div className="text-center">
          {imageEncoding ? (
            <LoadingIndicator message="Encoding image..." />
          ) : imagePreview ? (
            <img className="logo" alt={name} src={imagePreview} />
          ) : (
            ""
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
              title: "URL",
              value: url,
              isEditing: !!isEditing,
              onChange: setUrl,
            })}
            <tr>
              <td>Parent Studio</td>
              <td>{renderStudio()}</td>
            </tr>
            {!isEditing && renderStashIDs()}
          </tbody>
        </Table>
        <DetailsEditNavbar
          objectName={name ?? "studio"}
          isNew={isNew}
          isEditing={isEditing}
          onToggleEdit={onToggleEdit}
          onSave={onSave}
          onImageChange={onImageChangeHandler}
          onClearImage={() => {
            onClearImage();
          }}
          onAutoTag={onAutoTag}
          onDelete={onDelete}
          acceptSVG
        />
      </div>
      {!isNew && (
        <div className="col col-md-8">
          <Tabs
            id="studio-tabs"
            mountOnEnter
            unmountOnExit
            activeKey={activeTabKey}
            onSelect={setActiveTabKey}
          >
            <Tab eventKey="scenes" title="Scenes">
              <StudioScenesPanel studio={studio} />
            </Tab>
            <Tab eventKey="images" title="Images">
              <StudioImagesPanel studio={studio} />
            </Tab>
            <Tab eventKey="childstudios" title="Child Studios">
              <StudioChildrenPanel studio={studio} />
            </Tab>
          </Tabs>
        </div>
      )}
      {renderDeleteAlert()}
    </div>
  );
};
