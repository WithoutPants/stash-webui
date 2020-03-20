import React from "react";
import { Route, Switch } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { ToastProvider } from "src/hooks/Toast";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";

import locales from "src/locale";
import { StashService } from "src/core/StashService";
import { flattenMessages } from "src/utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Galleries from "./components/Galleries/Galleries";
import { MainNavbar } from "./components/MainNavbar";
import { PageNotFound } from "./components/PageNotFound";
import Performers from "./components/Performers/Performers";
import Scenes from "./components/Scenes/Scenes";
import { Settings } from "./components/Settings/Settings";
import { Stats } from "./components/Stats";
import Studios from "./components/Studios/Studios";
import { TagList } from "./components/Tags/TagList";
import { SceneFilenameParser } from "./components/SceneFilenameParser/SceneFilenameParser";
import Movies from "./components/Movies/Movies";

// Set fontawesome/free-solid-svg as default fontawesome icons
library.add(fas);

export const App: React.FC = () => {
  const config = StashService.useConfiguration();
  const language = config.data?.configuration?.interface?.language ?? "en-US";
  const messageLanguage = language.slice(0, 2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = flattenMessages((locales as any)[messageLanguage]);

  return (
    <ErrorBoundary>
      <IntlProvider locale={language} messages={messages}>
        <ToastProvider>
          <MainNavbar />
          <div className="main container-fluid">
            <Switch>
              <Route exact path="/" component={Stats} />
              <Route path="/scenes" component={Scenes} />
              <Route path="/galleries" component={Galleries} />
              <Route path="/performers" component={Performers} />
              <Route path="/tags" component={TagList} />
              <Route path="/studios" component={Studios} />
              <Route path="/movies" component={Movies} />
              <Route path="/settings" component={Settings} />
              <Route
                path="/sceneFilenameParser"
                component={SceneFilenameParser}
              />
              <Route component={PageNotFound} />
            </Switch>
          </div>
        </ToastProvider>
      </IntlProvider>
    </ErrorBoundary>
  );
};
