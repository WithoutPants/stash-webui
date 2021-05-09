import React, { useEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { Button, Form } from "react-bootstrap";

import * as GQL from "src/core/generated-graphql";
import { Modal, LoadingIndicator } from "src/components/Shared";

const CLASSNAME = "PerformerScrapeModal";
const CLASSNAME_LIST = `${CLASSNAME}-list`;

export interface IStashBox extends GQL.StashBox {
  index: number;
}

interface IProps {
  instance: IStashBox;
  onHide: () => void;
  onSelectPerformer: (performer: GQL.ScrapedScenePerformer) => void;
  name?: string;
}
const PerformerStashBoxModal: React.FC<IProps> = ({
  instance,
  name,
  onHide,
  onSelectPerformer,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<string>(name ?? "");
  const { data, loading } = GQL.useQueryStashBoxPerformerQuery({
    variables: {
      input: {
        stash_box_index: instance.index,
        q: query,
      },
    },
    skip: query === "",
  });

  const performers = data?.queryStashBoxPerformer?.[0].results ?? [];

  const onInputChange = debounce((input: string) => {
    setQuery(input);
  }, 500);

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <Modal
      show
      onHide={onHide}
      header={`Scrape performer from ${instance.name ?? "Stash-Box"}`}
      accept={{ text: "Cancel", onClick: onHide, variant: "secondary" }}
    >
      <div className={CLASSNAME}>
        <Form.Control
          onChange={(e) => onInputChange(e.currentTarget.value)}
          defaultValue={name ?? ""}
          placeholder="Performer name..."
          className="text-input mb-4"
          ref={inputRef}
        />
        {loading ? (
          <div className="m-4 text-center">
            <LoadingIndicator inline />
          </div>
        ) : performers.length > 0 ? (
          <ul className={CLASSNAME_LIST}>
            {performers.map((p) => (
              <li key={p.url}>
                <Button variant="link" onClick={() => onSelectPerformer(p)}>
                  {p.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          query !== "" && <h5 className="text-center">No results found.</h5>
        )}
      </div>
    </Modal>
  );
};

export default PerformerStashBoxModal;
