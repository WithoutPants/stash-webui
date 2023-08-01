import React, { useState } from "react";
import {
  Form,
  Col,
  Row,
  InputGroup,
  Button,
  FormControl,
  Badge,
} from "react-bootstrap";
import { CollapseButton } from "./CollapseButton";
import { Icon } from "./Icon";
import { ModalComponent } from "./Modal";
import isEqual from "lodash-es/isEqual";
import clone from "lodash-es/clone";
import { FormattedMessage, useIntl } from "react-intl";
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faPencilAlt,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { getCountryByISO } from "src/utils/country";
import { CountrySelect } from "./CountrySelect";
import { StringListInput } from "./StringListInput";

export class ScrapeResult<T> {
  public newValue?: T;
  public originalValue?: T;
  public scraped: boolean = false;
  public useNewValue: boolean = false;

  public constructor(
    originalValue?: T | null,
    newValue?: T | null,
    useNewValue?: boolean
  ) {
    this.originalValue = originalValue ?? undefined;
    this.newValue = newValue ?? undefined;
    // NOTE: this means that zero values are treated as null
    // this is incorrect for numbers and booleans, but correct for strings
    const hasNewValue = !!this.newValue;

    const valuesEqual = isEqual(originalValue, newValue);
    this.useNewValue = useNewValue ?? (hasNewValue && !valuesEqual);
    this.scraped = hasNewValue && !valuesEqual;
  }

  public setOriginalValue(value?: T) {
    this.originalValue = value;
    this.newValue = value;
  }

  public cloneWithValue(value?: T) {
    const ret = clone(this);

    ret.newValue = value;
    ret.useNewValue = !isEqual(ret.newValue, ret.originalValue);

    // #2691 - if we're setting the value, assume it should be treated as
    // scraped
    ret.scraped = true;

    return ret;
  }

  public getNewValue() {
    if (this.useNewValue) {
      return this.newValue;
    }
  }
}

// for types where !!value is a valid value (boolean and number)
export class ZeroableScrapeResult<T> extends ScrapeResult<T> {
  public constructor(
    originalValue?: T | null,
    newValue?: T | null,
    useNewValue?: boolean
  ) {
    super(originalValue, newValue, useNewValue);

    const hasNewValue = this.newValue !== undefined;

    const valuesEqual = isEqual(originalValue, newValue);
    this.useNewValue = useNewValue ?? (hasNewValue && !valuesEqual);
    this.scraped = hasNewValue && !valuesEqual;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasScrapedValues(values: ScrapeResult<any>[]) {
  return values.some((r) => r.scraped);
}

export interface IHasName {
  name: string | undefined;
}

interface IScrapedFieldProps<T> {
  result: ScrapeResult<T>;
}

interface IScrapedRowProps<T, V extends IHasName>
  extends IScrapedFieldProps<T> {
  className?: string;
  title: string;
  renderOriginalField: (result: ScrapeResult<T>) => JSX.Element | undefined;
  renderNewField: (result: ScrapeResult<T>) => JSX.Element | undefined;
  onChange: (value: ScrapeResult<T>) => void;
  newValues?: V[];
  onCreateNew?: (index: number) => void;
}

function renderButtonIcon(selected: boolean) {
  const className = selected ? "text-success" : "text-muted";

  return (
    <Icon
      className={`fa-fw ${className}`}
      icon={selected ? faCheck : faTimes}
    />
  );
}

export const ScrapeDialogRow = <T, V extends IHasName>(
  props: IScrapedRowProps<T, V>
) => {
  function handleSelectClick(isNew: boolean) {
    const ret = clone(props.result);
    ret.useNewValue = isNew;
    props.onChange(ret);
  }

  function hasNewValues() {
    return props.newValues && props.newValues.length > 0 && props.onCreateNew;
  }

  if (!props.result.scraped && !hasNewValues()) {
    return <></>;
  }

  function renderNewValues() {
    if (!hasNewValues()) {
      return;
    }

    const ret = (
      <>
        {props.newValues!.map((t, i) => (
          <Badge
            className="tag-item"
            variant="secondary"
            key={t.name}
            onClick={() => props.onCreateNew!(i)}
          >
            {t.name}
            <Button className="minimal ml-2">
              <Icon className="fa-fw" icon={faPlus} />
            </Button>
          </Badge>
        ))}
      </>
    );

    const minCollapseLength = 10;

    if (props.newValues!.length >= minCollapseLength) {
      return (
        <CollapseButton text={`Missing (${props.newValues!.length})`}>
          {ret}
        </CollapseButton>
      );
    }

    return ret;
  }

  return (
    <Row className={`px-3 pt-3 ${props.className ?? ""}`}>
      <Form.Label column lg="3">
        {props.title}
      </Form.Label>

      <Col lg="9">
        <Row>
          <Col xs="6">
            <InputGroup>
              <InputGroup.Prepend className="bg-secondary text-white border-secondary">
                <Button
                  variant="secondary"
                  onClick={() => handleSelectClick(false)}
                >
                  {renderButtonIcon(!props.result.useNewValue)}
                </Button>
              </InputGroup.Prepend>
              {props.renderOriginalField(props.result)}
            </InputGroup>
          </Col>
          <Col xs="6">
            <InputGroup>
              <InputGroup.Prepend>
                <Button
                  variant="secondary"
                  onClick={() => handleSelectClick(true)}
                >
                  {renderButtonIcon(props.result.useNewValue)}
                </Button>
              </InputGroup.Prepend>
              {props.renderNewField(props.result)}
            </InputGroup>
            {renderNewValues()}
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

interface IScrapedInputGroupProps {
  isNew?: boolean;
  placeholder?: string;
  locked?: boolean;
  result: ScrapeResult<string>;
  onChange?: (value: string) => void;
}

const ScrapedInputGroup: React.FC<IScrapedInputGroupProps> = (props) => {
  return (
    <FormControl
      placeholder={props.placeholder}
      value={props.isNew ? props.result.newValue : props.result.originalValue}
      readOnly={!props.isNew || props.locked}
      onChange={(e) => {
        if (props.isNew && props.onChange) {
          props.onChange(e.target.value);
        }
      }}
      className="bg-secondary text-white border-secondary"
    />
  );
};

interface IScrapedInputGroupRowProps {
  title: string;
  placeholder?: string;
  result: ScrapeResult<string>;
  locked?: boolean;
  onChange: (value: ScrapeResult<string>) => void;
}

export const ScrapedInputGroupRow: React.FC<IScrapedInputGroupRowProps> = (
  props
) => {
  return (
    <ScrapeDialogRow
      title={props.title}
      result={props.result}
      renderOriginalField={() => (
        <ScrapedInputGroup
          placeholder={props.placeholder || props.title}
          result={props.result}
        />
      )}
      renderNewField={() => (
        <ScrapedInputGroup
          placeholder={props.placeholder || props.title}
          result={props.result}
          isNew
          locked={props.locked}
          onChange={(value) =>
            props.onChange(props.result.cloneWithValue(value))
          }
        />
      )}
      onChange={props.onChange}
    />
  );
};

interface IScrapedStringListProps {
  isNew?: boolean;
  placeholder?: string;
  locked?: boolean;
  result: ScrapeResult<string[]>;
  onChange?: (value: string[]) => void;
}

const ScrapedStringList: React.FC<IScrapedStringListProps> = (props) => {
  const value = props.isNew
    ? props.result.newValue
    : props.result.originalValue;

  return (
    <StringListInput
      value={value ?? []}
      setValue={(v) => {
        if (props.isNew && props.onChange) {
          props.onChange(v);
        }
      }}
      placeholder={props.placeholder}
      readOnly={!props.isNew || props.locked}
    />
  );
};

interface IScrapedStringListRowProps {
  title: string;
  placeholder?: string;
  result: ScrapeResult<string[]>;
  locked?: boolean;
  onChange: (value: ScrapeResult<string[]>) => void;
}

export const ScrapedStringListRow: React.FC<IScrapedStringListRowProps> = (
  props
) => {
  return (
    <ScrapeDialogRow
      className="string-list-row"
      title={props.title}
      result={props.result}
      renderOriginalField={() => (
        <ScrapedStringList
          placeholder={props.placeholder || props.title}
          result={props.result}
        />
      )}
      renderNewField={() => (
        <ScrapedStringList
          placeholder={props.placeholder || props.title}
          result={props.result}
          isNew
          locked={props.locked}
          onChange={(value) =>
            props.onChange(props.result.cloneWithValue(value))
          }
        />
      )}
      onChange={props.onChange}
    />
  );
};

const ScrapedTextArea: React.FC<IScrapedInputGroupProps> = (props) => {
  return (
    <FormControl
      as="textarea"
      placeholder={props.placeholder}
      value={props.isNew ? props.result.newValue : props.result.originalValue}
      readOnly={!props.isNew}
      onChange={(e) => {
        if (props.isNew && props.onChange) {
          props.onChange(e.target.value);
        }
      }}
      className="bg-secondary text-white border-secondary scene-description"
    />
  );
};

export const ScrapedTextAreaRow: React.FC<IScrapedInputGroupRowProps> = (
  props
) => {
  return (
    <ScrapeDialogRow
      title={props.title}
      result={props.result}
      renderOriginalField={() => (
        <ScrapedTextArea
          placeholder={props.placeholder || props.title}
          result={props.result}
        />
      )}
      renderNewField={() => (
        <ScrapedTextArea
          placeholder={props.placeholder || props.title}
          result={props.result}
          isNew
          onChange={(value) =>
            props.onChange(props.result.cloneWithValue(value))
          }
        />
      )}
      onChange={props.onChange}
    />
  );
};

interface IScrapedImageProps {
  isNew?: boolean;
  className?: string;
  placeholder?: string;
  result: ScrapeResult<string>;
}

const ScrapedImage: React.FC<IScrapedImageProps> = (props) => {
  const value = props.isNew
    ? props.result.newValue
    : props.result.originalValue;

  if (!value) {
    return <></>;
  }

  return (
    <img className={props.className} src={value} alt={props.placeholder} />
  );
};

interface IScrapedImageRowProps {
  title: string;
  className?: string;
  result: ScrapeResult<string>;
  onChange: (value: ScrapeResult<string>) => void;
}

export const ScrapedImageRow: React.FC<IScrapedImageRowProps> = (props) => {
  return (
    <ScrapeDialogRow
      title={props.title}
      result={props.result}
      renderOriginalField={() => (
        <ScrapedImage
          result={props.result}
          className={props.className}
          placeholder={props.title}
        />
      )}
      renderNewField={() => (
        <ScrapedImage
          result={props.result}
          className={props.className}
          placeholder={props.title}
          isNew
        />
      )}
      onChange={props.onChange}
    />
  );
};

interface IScrapedImageDialogRowProps<
  T extends ScrapeResult<string>,
  V extends IHasName
> extends IScrapedFieldProps<string> {
  title: string;
  renderOriginalField: () => JSX.Element | undefined;
  renderNewField: () => JSX.Element | undefined;
  onChange: (value: T) => void;
  newValues?: V[];
  images: string[];
  onCreateNew?: (index: number) => void;
}

export const ScrapeImageDialogRow = <
  T extends ScrapeResult<string>,
  V extends IHasName
>(
  props: IScrapedImageDialogRowProps<T, V>
) => {
  const [imageIndex, setImageIndex] = useState(0);

  function hasNewValues() {
    return props.newValues && props.newValues.length > 0 && props.onCreateNew;
  }

  function setPrev() {
    let newIdx = imageIndex - 1;
    if (newIdx < 0) {
      newIdx = props.images.length - 1;
    }
    const ret = props.result.cloneWithValue(props.images[newIdx]);
    props.onChange(ret as T);
    setImageIndex(newIdx);
  }

  function setNext() {
    let newIdx = imageIndex + 1;
    if (newIdx >= props.images.length) {
      newIdx = 0;
    }
    const ret = props.result.cloneWithValue(props.images[newIdx]);
    props.onChange(ret as T);
    setImageIndex(newIdx);
  }

  if (!props.result.scraped && !hasNewValues()) {
    return <></>;
  }

  function renderSelector() {
    return (
      props.images.length > 1 && (
        <div className="d-flex mt-2 image-selection">
          <Button onClick={setPrev}>
            <Icon icon={faArrowLeft} />
          </Button>
          <h5 className="flex-grow-1 px-2">
            Select performer image
            <br />
            {imageIndex + 1} of {props.images.length}
          </h5>
          <Button onClick={setNext}>
            <Icon icon={faArrowRight} />
          </Button>
        </div>
      )
    );
  }

  function renderNewValues() {
    if (!hasNewValues()) {
      return;
    }

    const ret = (
      <>
        {props.newValues!.map((t, i) => (
          <Badge
            className="tag-item"
            variant="secondary"
            key={t.name}
            onClick={() => props.onCreateNew!(i)}
          >
            {t.name}
            <Button className="minimal ml-2">
              <Icon className="fa-fw" icon={faPlus} />
            </Button>
          </Badge>
        ))}
      </>
    );

    const minCollapseLength = 10;

    if (props.newValues!.length >= minCollapseLength) {
      return (
        <CollapseButton text={`Missing (${props.newValues!.length})`}>
          {ret}
        </CollapseButton>
      );
    }

    return ret;
  }

  return (
    <Row className="px-3 pt-3">
      <Form.Label column lg="3">
        {props.title}
      </Form.Label>

      <Col lg="9">
        <Row>
          <Col xs="6">
            <InputGroup>{props.renderOriginalField()}</InputGroup>
          </Col>
          <Col xs="6">
            <InputGroup>
              {props.renderNewField()}
              {renderSelector()}
            </InputGroup>
            {renderNewValues()}
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

interface IScrapedImagesRowProps {
  title: string;
  className?: string;
  result: ScrapeResult<string>;
  images: string[];
  onChange: (value: ScrapeResult<string>) => void;
}

export const ScrapedImagesRow: React.FC<IScrapedImagesRowProps> = (props) => {
  return (
    <ScrapeImageDialogRow
      title={props.title}
      result={props.result}
      images={props.images}
      renderOriginalField={() => (
        <ScrapedImage
          result={props.result}
          className={props.className}
          placeholder={props.title}
        />
      )}
      renderNewField={() => (
        <ScrapedImage
          result={props.result}
          className={props.className}
          placeholder={props.title}
          isNew
        />
      )}
      onChange={props.onChange}
    />
  );
};

interface IScrapeDialogProps {
  title: string;
  existingLabel?: string;
  scrapedLabel?: string;
  renderScrapeRows: () => JSX.Element;
  onClose: (apply?: boolean) => void;
}

export const ScrapeDialog: React.FC<IScrapeDialogProps> = (
  props: IScrapeDialogProps
) => {
  const intl = useIntl();
  return (
    <ModalComponent
      show
      icon={faPencilAlt}
      header={props.title}
      accept={{
        onClick: () => {
          props.onClose(true);
        },
        text: intl.formatMessage({ id: "actions.apply" }),
      }}
      cancel={{
        onClick: () => props.onClose(),
        text: intl.formatMessage({ id: "actions.cancel" }),
        variant: "secondary",
      }}
      modalProps={{ size: "lg", dialogClassName: "scrape-dialog" }}
    >
      <div className="dialog-container">
        <Form>
          <Row className="px-3 pt-3">
            <Col lg={{ span: 9, offset: 3 }}>
              <Row>
                <Form.Label column xs="6">
                  {props.existingLabel ?? (
                    <FormattedMessage id="dialogs.scrape_results_existing" />
                  )}
                </Form.Label>
                <Form.Label column xs="6">
                  {props.scrapedLabel ?? (
                    <FormattedMessage id="dialogs.scrape_results_scraped" />
                  )}
                </Form.Label>
              </Row>
            </Col>
          </Row>

          {props.renderScrapeRows()}
        </Form>
      </div>
    </ModalComponent>
  );
};

interface IScrapedCountryRowProps {
  title: string;
  result: ScrapeResult<string>;
  onChange: (value: ScrapeResult<string>) => void;
  locked?: boolean;
  locale?: string;
}

export const ScrapedCountryRow: React.FC<IScrapedCountryRowProps> = ({
  title,
  result,
  onChange,
  locked,
  locale,
}) => (
  <ScrapeDialogRow
    title={title}
    result={result}
    renderOriginalField={() => (
      <FormControl
        value={
          getCountryByISO(result.originalValue, locale) ?? result.originalValue
        }
        readOnly
        className="bg-secondary text-white border-secondary"
      />
    )}
    renderNewField={() => (
      <CountrySelect
        value={result.newValue}
        disabled={locked}
        onChange={(value) => {
          if (onChange) {
            onChange(result.cloneWithValue(value));
          }
        }}
        showFlag={false}
        isClearable={false}
        className="flex-grow-1"
      />
    )}
    onChange={onChange}
  />
);
