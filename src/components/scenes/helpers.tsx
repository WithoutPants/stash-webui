import React, {  } from "react";
import { Link } from "react-router-dom";
import * as GQL from "src/core/generated-graphql";

export class SceneHelpers {
  public static maybeRenderStudio(
    scene: GQL.SceneDataFragment | GQL.SlimSceneDataFragment,
    height: number
  ) {
    if (!scene.studio)
      return;
    const style: React.CSSProperties = {
      backgroundImage: `url('${scene.studio.image_path}')`,
      width: "100%",
      height: `${height}px`,
      lineHeight: 5,
      backgroundSize: "contain",
      display: "inline-block",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
    return (
      <Link
        to={`/studios/${scene.studio.id}`}
        style={style}
      />
    );
  }

  public static getJWPlayerId(): string { return "main-jwplayer"; }
  public static getPlayer(): any {
    return (window as any).jwplayer("main-jwplayer");
  }
}
