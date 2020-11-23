import React, { useState } from "react";
import { Button, Card, Form, InputGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { ScenePreview } from "src/components/Scenes/SceneCard";

import * as GQL from "src/core/generated-graphql";
import { LoadingIndicator } from "src/components/Shared";
import {
  stashBoxQuery,
  stashBoxBatchQuery,
  useConfiguration,
} from "src/core/StashService";
import { Manual } from "src/components/Help/Manual";

import StashSearchResult from "./StashSearchResult";
import Config, { ITaggerConfig, initialConfig, ParseMode } from "./Config";
import {
  parsePath,
  selectScenes,
  IStashBoxScene,
  sortScenesByDuration,
} from "./utils";

const dateRegex = /\.(\d\d)\.(\d\d)\.(\d\d)\./;
function prepareQueryString(
  scene: Partial<GQL.SlimSceneDataFragment>,
  paths: string[],
  filename: string,
  mode: ParseMode,
  blacklist: string[]
) {
  if ((mode === "auto" && scene.date && scene.studio) || mode === "metadata") {
    let str = [
      scene.date,
      scene.studio?.name ?? "",
      (scene?.performers ?? []).map((p) => p.name).join(" "),
      scene?.title ? scene.title.replace(/[^a-zA-Z0-9 ]+/g, "") : "",
    ]
      .filter((s) => s !== "")
      .join(" ");
    blacklist.forEach((b) => {
      str = str.replace(new RegExp(b, "gi"), " ");
    });
    return str;
  }
  let s = "";
  if (mode === "auto" || mode === "filename") {
    s = filename;
  } else if (mode === "path") {
    s = [...paths, filename].join(" ");
  } else {
    s = paths[paths.length - 1];
  }
  blacklist.forEach((b) => {
    s = s.replace(new RegExp(b, "i"), "");
  });
  const date = s.match(dateRegex);
  s = s.replace(/-/g, " ");
  if (date) {
    s = s.replace(date[0], ` 20${date[1]}-${date[2]}-${date[3]} `);
  }
  return s.replace(/\./g, " ");
}

interface ITaggerListProps {
  scenes: GQL.SlimSceneDataFragment[];
  selectedEndpoint: { endpoint: string; index: number };
  config: ITaggerConfig;
  queueFingerprintSubmission: (sceneId: string, endpoint: string) => void;
  clearSubmissionQueue: (endpoint: string) => void;
}

const TaggerList: React.FC<ITaggerListProps> = ({
  scenes,
  selectedEndpoint,
  config,
  queueFingerprintSubmission,
  clearSubmissionQueue,
}) => {
  const [fingerprintError, setFingerprintError] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryString, setQueryString] = useState<Record<string, string>>({});

  const [searchResults, setSearchResults] = useState<
    Record<string, IStashBoxScene[]>
  >({});
  const [searchErrors, setSearchErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [selectedResult, setSelectedResult] = useState<
    Record<string, number>
  >();
  const [taggedScenes, setTaggedScenes] = useState<
    Record<string, Partial<GQL.SlimSceneDataFragment>>
  >({});
  const [loadingFingerprints, setLoadingFingerprints] = useState(false);
  const [fingerprints, setFingerprints] = useState<
    Record<string, IStashBoxScene>
  >({});
  const fingerprintQueue =
    config.fingerprintQueue[selectedEndpoint.endpoint] ?? [];

  const doBoxSearch = (sceneID: string, searchVal: string) => {
    stashBoxQuery(searchVal, selectedEndpoint.index)
      .then((queryData) => {
        const s = selectScenes(queryData.data?.queryStashBoxScene);
        setSearchResults({
          ...searchResults,
          [sceneID]: s,
        });
        setSearchErrors({
          ...searchErrors,
          [sceneID]: undefined,
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // Destructure to remove existing result
        const { [sceneID]: unassign, ...results } = searchResults;
        setSearchResults(results);
        setSearchErrors({
          ...searchErrors,
          [sceneID]: "Network Error",
        });
      });

    setLoading(true);
  };

  const [
    submitFingerPrints,
    { loading: submittingFingerprints },
  ] = GQL.useSubmitStashBoxFingerprintsMutation({
    onCompleted: (result) => {
      setFingerprintError("");
      if (result.submitStashBoxFingerprints)
        clearSubmissionQueue(selectedEndpoint.endpoint);
    },
    onError: () => {
      setFingerprintError("Network Error");
    },
  });

  const handleFingerprintSubmission = () => {
    submitFingerPrints({
      variables: {
        input: {
          stash_box_index: selectedEndpoint.index,
          scene_ids: fingerprintQueue,
        },
      },
    });
  };

  const handleTaggedScene = (scene: Partial<GQL.SlimSceneDataFragment>) => {
    setTaggedScenes({
      ...taggedScenes,
      [scene.id as string]: scene,
    });
  };

  const handleFingerprintSearch = async () => {
    setLoadingFingerprints(true);
    const newFingerprints = { ...fingerprints };

    const sceneIDs = scenes
      .filter((s) => s.stash_ids.length === 0)
      .map((s) => s.id);

    const results = await stashBoxBatchQuery(
      sceneIDs,
      selectedEndpoint.index
    ).catch(() => {
      setLoadingFingerprints(false);
      setFingerprintError("Network Error");
    });

    if (!results) return;

    // clear search errors
    setSearchErrors({});

    selectScenes(results.data?.queryStashBoxScene).forEach((scene) => {
      scene.fingerprints?.forEach((f) => {
        newFingerprints[f.hash] = scene;
      });
    });

    // Null any ids that are still undefined since it means they weren't found
    sceneIDs.forEach((id) => {
      newFingerprints[id] = newFingerprints[id] ?? null;
    });

    setFingerprints(newFingerprints);
    setLoadingFingerprints(false);
    setFingerprintError("");
  };

  const canFingerprintSearch = () =>
    scenes.some(
      (s) => s.stash_ids.length === 0 && fingerprints[s.id] === undefined
    );

  const getFingerprintCount = () => {
    const count = scenes.filter(
      (s) =>
        s.stash_ids.length === 0 &&
        ((s.checksum && fingerprints[s.checksum]) ||
          (s.oshash && fingerprints[s.oshash]))
    ).length;
    return `${count > 0 ? count : "No"} new fingerprint matches found`;
  };

  const renderScenes = () =>
    scenes.map((scene) => {
      const { paths, file, ext } = parsePath(scene.path);
      const originalDir = scene.path.slice(
        0,
        scene.path.length - file.length - ext.length
      );
      const defaultQueryString = prepareQueryString(
        scene,
        paths,
        file,
        config.mode,
        config.blacklist
      );
      const modifiedQuery = queryString[scene.id];
      const fingerprintMatch =
        fingerprints[scene.checksum ?? ""] ??
        fingerprints[scene.oshash ?? ""] ??
        null;
      const isTagged = taggedScenes[scene.id];
      const hasStashIDs = scene.stash_ids.length > 0;
      const width = scene.file.width ? scene.file.width : 0;
      const height = scene.file.height ? scene.file.height : 0;
      const isPortrait = height > width;

      let mainContent;
      if (!isTagged && hasStashIDs) {
        mainContent = (
          <div className="text-right">
            <h5 className="text-bold">Scene already tagged</h5>
          </div>
        );
      } else if (!isTagged && !hasStashIDs) {
        mainContent = (
          <InputGroup>
            <Form.Control
              className="text-input"
              value={modifiedQuery || defaultQueryString}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQueryString({
                  ...queryString,
                  [scene.id]: e.currentTarget.value,
                })
              }
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" &&
                doBoxSearch(
                  scene.id,
                  queryString[scene.id] || defaultQueryString
                )
              }
            />
            <InputGroup.Append>
              <Button
                disabled={loading}
                onClick={() =>
                  doBoxSearch(
                    scene.id,
                    queryString[scene.id] || defaultQueryString
                  )
                }
              >
                Search
              </Button>
            </InputGroup.Append>
          </InputGroup>
        );
      } else if (isTagged) {
        mainContent = (
          <div className="d-flex flex-column text-right">
            <h5>Scene successfully tagged:</h5>
            <h6>
              <Link className="bold" to={`/scenes/${scene.id}`}>
                {taggedScenes[scene.id].title}
              </Link>
            </h6>
          </div>
        );
      }

      let subContent;
      if (scene.stash_ids.length > 0) {
        const stashLinks = scene.stash_ids.map((stashID) => {
          const base = stashID.endpoint.match(/https?:\/\/.*?\//)?.[0];
          const link = base ? (
            <a
              className="small d-block"
              href={`${base}scenes/${stashID.stash_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {stashID.stash_id}
            </a>
          ) : (
            <div className="small">{stashID.stash_id}</div>
          );

          return link;
        });
        subContent = <>{stashLinks}</>;
      } else if (searchErrors[scene.id]) {
        subContent = (
          <div className="text-danger font-weight-bold">
            {searchErrors[scene.id]}
          </div>
        );
      } else if (searchResults[scene.id]?.length === 0) {
        subContent = (
          <div className="text-danger font-weight-bold">No results found.</div>
        );
      }

      let searchResult;
      if (fingerprintMatch && !isTagged && !hasStashIDs) {
        searchResult = (
          <StashSearchResult
            showMales={config.showMales}
            stashScene={scene}
            isActive
            setActive={() => {}}
            setScene={handleTaggedScene}
            scene={fingerprintMatch}
            setCoverImage={config.setCoverImage}
            setTags={config.setTags}
            tagOperation={config.tagOperation}
            endpoint={selectedEndpoint.endpoint}
            queueFingerprintSubmission={queueFingerprintSubmission}
          />
        );
      } else if (
        searchResults[scene.id]?.length > 0 &&
        !isTagged &&
        !fingerprintMatch
      ) {
        searchResult = (
          <ul className="pl-0 mt-3 mb-0">
            {sortScenesByDuration(
              searchResults[scene.id],
              scene.file.duration ?? undefined
            ).map(
              (sceneResult, i) =>
                sceneResult && (
                  <StashSearchResult
                    key={sceneResult.stash_id}
                    showMales={config.showMales}
                    stashScene={scene}
                    scene={sceneResult}
                    isActive={(selectedResult?.[scene.id] ?? 0) === i}
                    setActive={() =>
                      setSelectedResult({
                        ...selectedResult,
                        [scene.id]: i,
                      })
                    }
                    setCoverImage={config.setCoverImage}
                    tagOperation={config.tagOperation}
                    setTags={config.setTags}
                    setScene={handleTaggedScene}
                    endpoint={selectedEndpoint.endpoint}
                    queueFingerprintSubmission={queueFingerprintSubmission}
                  />
                )
            )}
          </ul>
        );
      }

      return (
        <div key={scene.id} className="my-2 search-item">
          <div className="row">
            <div className="col col-lg-6 overflow-hidden align-items-center d-flex flex-column flex-sm-row">
              <div className="scene-card mr-3">
                <Link to={`/scenes/${scene.id}`}>
                  <ScenePreview
                    image={scene.paths.screenshot ?? undefined}
                    video={scene.paths.preview ?? undefined}
                    isPortrait={isPortrait}
                    soundActive={false}
                  />
                </Link>
              </div>
              <Link
                to={`/scenes/${scene.id}`}
                className="scene-link text-truncate w-100"
                title={scene.path}
              >
                {originalDir}
                <wbr />
                {`${file}.${ext}`}
              </Link>
            </div>
            <div className="col-md-6 my-1 align-self-center">
              {mainContent}
              <div className="sub-content text-right">{subContent}</div>
            </div>
          </div>
          {searchResult}
        </div>
      );
    });

  return (
    <Card className="tagger-table">
      <div className="tagger-table-header d-flex flex-nowrap align-items-center">
        <div className="col-md-6 pl-0">
          <b>Scene</b>
        </div>
        <div className="col-md-2">
          <b>Query</b>
        </div>
        <b className="ml-auto mr-2 text-danger">{fingerprintError}</b>
        <div className="mr-2">
          {fingerprintQueue.length > 0 && (
            <Button
              onClick={handleFingerprintSubmission}
              disabled={submittingFingerprints}
            >
              {submittingFingerprints ? (
                <LoadingIndicator message="" inline small />
              ) : (
                <span>
                  Submit <b>{fingerprintQueue.length}</b> Fingerprints
                </span>
              )}
            </Button>
          )}
        </div>
        <Button
          onClick={handleFingerprintSearch}
          disabled={!canFingerprintSearch() && !loadingFingerprints}
        >
          {canFingerprintSearch() && <span>Match Fingerprints</span>}
          {!canFingerprintSearch() && getFingerprintCount()}
          {loadingFingerprints && <LoadingIndicator message="" inline small />}
        </Button>
      </div>
      {renderScenes()}
    </Card>
  );
};

interface ITaggerProps {
  scenes: GQL.SlimSceneDataFragment[];
}

export const Tagger: React.FC<ITaggerProps> = ({ scenes }) => {
  const stashConfig = useConfiguration();
  const [config, setConfig] = useState<ITaggerConfig>(initialConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const savedEndpointIndex =
    stashConfig.data?.configuration.general.stashBoxes.findIndex(
      (s) => s.endpoint === config.selectedEndpoint
    ) ?? -1;
  const selectedEndpointIndex =
    savedEndpointIndex === -1 &&
    stashConfig.data?.configuration.general.stashBoxes.length
      ? 0
      : savedEndpointIndex;
  const selectedEndpoint =
    stashConfig.data?.configuration.general.stashBoxes[selectedEndpointIndex];

  const queueFingerprintSubmission = (sceneId: string, endpoint: string) => {
    setConfig({
      ...config,
      fingerprintQueue: {
        ...config.fingerprintQueue,
        [endpoint]: [...(config.fingerprintQueue[endpoint] ?? []), sceneId],
      },
    });
  };

  const clearSubmissionQueue = (endpoint: string) => {
    setConfig({
      ...config,
      fingerprintQueue: {
        ...config.fingerprintQueue,
        [endpoint]: [],
      },
    });
  };

  return (
    <>
      <Manual
        show={showManual}
        onClose={() => setShowManual(false)}
        defaultActiveTab="Tagger.md"
      />
      <div className="tagger-container row mx-md-auto">
        {selectedEndpointIndex !== -1 && selectedEndpoint ? (
          <>
            <div className="row mb-2 no-gutters">
              <Button onClick={() => setShowConfig(!showConfig)} variant="link">
                {showConfig ? "Hide" : "Show"} Configuration
              </Button>
              <Button
                className="ml-auto"
                onClick={() => setShowManual(true)}
                title="Help"
                variant="link"
              >
                Help
              </Button>
            </div>

            <Config config={config} setConfig={setConfig} show={showConfig} />
            <TaggerList
              scenes={scenes}
              config={config}
              selectedEndpoint={{
                endpoint: selectedEndpoint.endpoint,
                index: selectedEndpointIndex,
              }}
              queueFingerprintSubmission={queueFingerprintSubmission}
              clearSubmissionQueue={clearSubmissionQueue}
            />
          </>
        ) : (
          <div className="my-4">
            <h3 className="text-center mt-4">
              To use the scene tagger a stash-box instance needs to be
              configured.
            </h3>
            <h5 className="text-center">
              Please see{" "}
              <HashLink
                to="/settings?tab=configuration#stashbox"
                scroll={(el) =>
                  el.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Settings.
              </HashLink>
            </h5>
          </div>
        )}
      </div>
    </>
  );
};
