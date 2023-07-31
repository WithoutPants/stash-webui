import React from "react";
import { Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import { DetailItem } from "src/components/Shared/DetailItem";
import * as GQL from "src/core/generated-graphql";

interface ITagDetails {
  tag: GQL.TagDataFragment;
  fullWidth?: boolean;
}

export const TagDetailsPanel: React.FC<ITagDetails> = ({ tag, fullWidth }) => {
  function renderParentsField() {
    if (!tag.parents?.length) {
      return;
    }

    return (
      <>
        {tag.parents.map((p) => (
          <Badge key={p.id} className="tag-item" variant="secondary">
            <Link to={`/tags/${p.id}`}>{p.name}</Link>
          </Badge>
        ))}
      </>
    );
  }

  function renderChildrenField() {
    if (!tag.children?.length) {
      return;
    }

    return (
      <>
        {tag.children.map((c) => (
          <Badge key={c.id} className="tag-item" variant="secondary">
            <Link to={`/tags/${c.id}`}>{c.name}</Link>
          </Badge>
        ))}
      </>
    );
  }

  return (
    <div className="detail-group">
      <DetailItem
        id="description"
        value={tag.description}
        fullWidth={fullWidth}
      />
      <DetailItem
        id="parent_tags"
        value={renderParentsField()}
        fullWidth={fullWidth}
      />
      <DetailItem
        id="sub_tags"
        value={renderChildrenField()}
        fullWidth={fullWidth}
      />
    </div>
  );
};

export const CompressedTagDetailsPanel: React.FC<ITagDetails> = ({ tag }) => {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="sticky detail-header">
      <div className="sticky detail-header-group">
        <a className="tag-name" onClick={() => scrollToTop()}>
          {tag.name}
        </a>
        {tag.description ? (
          <span className="tag-desc">{tag.description}</span>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};
