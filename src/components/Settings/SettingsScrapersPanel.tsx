import React, { useState } from "react";
import { Button } from "react-bootstrap";
import {
  mutateReloadScrapers,
  useListMovieScrapers,
  useListPerformerScrapers,
  useListSceneScrapers,
} from "src/core/StashService";
import { useToast } from "src/hooks";
import { TextUtils } from "src/utils";
import { Icon, LoadingIndicator } from "src/components/Shared";
import { ScrapeType } from "src/core/generated-graphql";

interface IURLList {
  urls: string[];
}

const URLList: React.FC<IURLList> = ({ urls }) => {
  const maxCollapsedItems = 5;
  const [expanded, setExpanded] = useState<boolean>(false);

  function linkSite(url: string) {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  }

  function renderLink(url?: string) {
    if (url) {
      const sanitised = TextUtils.sanitiseURL(url);
      const siteURL = linkSite(sanitised!);

      return (
        <a
          href={siteURL}
          className="link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {sanitised}
        </a>
      );
    }
  }

  function getListItems() {
    const items = urls.map((u) => <li key={u}>{renderLink(u)}</li>);

    if (items.length > maxCollapsedItems) {
      if (!expanded) {
        items.length = maxCollapsedItems;
      }

      items.push(
        <li key="expand/collapse">
          <Button onClick={() => setExpanded(!expanded)} variant="link">
            {expanded ? "less" : "more"}
          </Button>
        </li>
      );
    }

    return items;
  }

  return <ul>{getListItems()}</ul>;
};

export const SettingsScrapersPanel: React.FC = () => {
  const Toast = useToast();
  const {
    data: performerScrapers,
    loading: loadingPerformers,
  } = useListPerformerScrapers();
  const {
    data: sceneScrapers,
    loading: loadingScenes,
  } = useListSceneScrapers();
  const {
    data: movieScrapers,
    loading: loadingMovies,
  } = useListMovieScrapers();

  async function onReloadScrapers() {
    await mutateReloadScrapers().catch((e) => Toast.error(e));
  }

  function renderPerformerScrapeTypes(types: ScrapeType[]) {
    const typeStrings = types
      .filter((t) => t !== ScrapeType.Fragment)
      .map((t) => {
        switch (t) {
          case ScrapeType.Name:
            return "Search by name";
          default:
            return t;
        }
      });

    return (
      <ul>
        {typeStrings.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    );
  }

  function renderSceneScrapeTypes(types: ScrapeType[]) {
    const typeStrings = types.map((t) => {
      switch (t) {
        case ScrapeType.Fragment:
          return "Scene Metadata";
        default:
          return t;
      }
    });

    return (
      <ul>
        {typeStrings.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    );
  }

  function renderMovieScrapeTypes(types: ScrapeType[]) {
    const typeStrings = types.map((t) => {
      switch (t) {
        case ScrapeType.Fragment:
          return "Movie Metadata";
        default:
          return t;
      }
    });

    return (
      <ul>
        {typeStrings.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    );
  }

  function renderURLs(urls: string[]) {
    return <URLList urls={urls} />;
  }

  function renderSceneScrapers() {
    const elements = (sceneScrapers?.listSceneScrapers ?? []).map((scraper) => (
      <tr key={scraper.id}>
        <td>{scraper.name}</td>
        <td>
          {renderSceneScrapeTypes(scraper.scene?.supported_scrapes ?? [])}
        </td>
        <td>{renderURLs(scraper.scene?.urls ?? [])}</td>
      </tr>
    ));

    return renderTable("Scene scrapers", elements);
  }

  function renderPerformerScrapers() {
    const elements = (performerScrapers?.listPerformerScrapers ?? []).map(
      (scraper) => (
        <tr key={scraper.id}>
          <td>{scraper.name}</td>
          <td>
            {renderPerformerScrapeTypes(
              scraper.performer?.supported_scrapes ?? []
            )}
          </td>
          <td>{renderURLs(scraper.performer?.urls ?? [])}</td>
        </tr>
      )
    );

    return renderTable("Performer scrapers", elements);
  }

  function renderMovieScrapers() {
    const elements = (movieScrapers?.listMovieScrapers ?? []).map((scraper) => (
      <tr key={scraper.id}>
        <td>{scraper.name}</td>
        <td>
          {renderMovieScrapeTypes(scraper.movie?.supported_scrapes ?? [])}
        </td>
        <td>{renderURLs(scraper.movie?.urls ?? [])}</td>
      </tr>
    ));

    return renderTable("Movie scrapers", elements);
  }

  function renderTable(title: string, elements: JSX.Element[]) {
    if (elements.length > 0) {
      return (
        <div className="mb-2">
          <h5>{title}</h5>
          <table className="scraper-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Supported types</th>
                <th>URLs</th>
              </tr>
            </thead>
            <tbody>{elements}</tbody>
          </table>
        </div>
      );
    }
  }

  if (loadingScenes || loadingPerformers || loadingMovies)
    return <LoadingIndicator />;

  return (
    <>
      <h4>Scrapers</h4>
      <div className="mb-3">
        <Button onClick={() => onReloadScrapers()}>
          <span className="fa-icon">
            <Icon icon="sync-alt" />
          </span>
          <span>Reload scrapers</span>
        </Button>
      </div>

      <div>
        {renderSceneScrapers()}
        {renderPerformerScrapers()}
        {renderMovieScrapers()}
      </div>
    </>
  );
};
