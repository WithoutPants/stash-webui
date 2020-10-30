import React from "react";
import { Link } from "react-router-dom";
import { FormattedNumber, FormattedPlural, FormattedMessage } from "react-intl";
import * as GQL from "src/core/generated-graphql";
import { NavUtils, TextUtils } from "src/utils";
import { CountryFlag } from "src/components/Shared";
import { BasicCard } from "../Shared/BasicCard";

interface IPerformerCardProps {
  performer: GQL.PerformerDataFragment;
  ageFromDate?: string;
  selecting?: boolean;
  selected?: boolean;
  onSelectedChanged?: (selected: boolean, shiftKey: boolean) => void;
}

export const PerformerCard: React.FC<IPerformerCardProps> = ({
  performer,
  ageFromDate,
  selecting,
  selected,
  onSelectedChanged,
}) => {
  const age = TextUtils.age(performer.birthdate, ageFromDate);
  const ageString = `${age} years old${ageFromDate ? " in this scene." : "."}`;

  function maybeRenderFavoriteBanner() {
    if (performer.favorite === false) {
      return;
    }
    return (
      <div className="rating-banner rating-5">
        <FormattedMessage id="favourite" defaultMessage="Favourite" />
      </div>
    );
  }

  return (
    <BasicCard
      className="performer-card"
      url={`/performers/${performer.id}`}
      image={
        <>
          <img
            className="performer-card-image"
            alt={performer.name ?? ""}
            src={performer.image_path ?? ""}
          />
          {maybeRenderFavoriteBanner()}
        </>
      }
      details={
        <>
          <h5 className="text-truncate">{performer.name}</h5>
          {age !== 0 ? <div className="text-muted">{ageString}</div> : ""}
          <Link to={NavUtils.makePerformersCountryUrl(performer)}>
            <CountryFlag country={performer.country} />
          </Link>
          <div className="text-muted">
            Stars in&nbsp;
            <FormattedNumber value={performer.scene_count ?? 0} />
            &nbsp;
            <Link to={NavUtils.makePerformerScenesUrl(performer)}>
              <FormattedPlural
                value={performer.scene_count ?? 0}
                one="scene"
                other="scenes"
              />
            </Link>
            .
          </div>
        </>
      }
      selected={selected}
      selecting={selecting}
      onSelectedChanged={onSelectedChanged}
    />
  );
};
