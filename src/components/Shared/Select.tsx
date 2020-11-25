import React, { useState, CSSProperties } from "react";
import Select, { ValueType, Props } from "react-select";
import CreatableSelect from "react-select/creatable";
import { debounce } from "lodash";

import * as GQL from "src/core/generated-graphql";
import {
  useAllTagsForFilter,
  useAllMoviesForFilter,
  useAllStudiosForFilter,
  useAllPerformersForFilter,
  useMarkerStrings,
  useScrapePerformerList,
  useTagCreate,
  useStudioCreate,
  usePerformerCreate,
  useFindGalleries,
} from "src/core/StashService";
import { useToast } from "src/hooks";
import { ListFilterModel } from "src/models/list-filter/filter";
import { FilterMode } from "src/models/list-filter/types";

export type ValidTypes =
  | GQL.SlimPerformerDataFragment
  | GQL.Tag
  | GQL.SlimStudioDataFragment
  | GQL.SlimMovieDataFragment;
type Option = { value: string; label: string };

interface ITypeProps {
  type?:
    | "performers"
    | "studios"
    | "parent_studios"
    | "tags"
    | "sceneTags"
    | "movies";
}
interface IFilterProps {
  ids?: string[];
  initialIds?: string[];
  onSelect?: (item: ValidTypes[]) => void;
  noSelectionString?: string;
  className?: string;
  isMulti?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
}
interface ISelectProps {
  className?: string;
  items: Option[];
  selectedOptions?: Option[];
  creatable?: boolean;
  onCreateOption?: (value: string) => void;
  isLoading: boolean;
  isDisabled?: boolean;
  onChange: (item: ValueType<Option>) => void;
  initialIds?: string[];
  isMulti?: boolean;
  isClearable?: boolean;
  onInputChange?: (input: string) => void;
  placeholder?: string;
  showDropdown?: boolean;
  groupHeader?: string;
  closeMenuOnSelect?: boolean;
}
interface IFilterComponentProps extends IFilterProps {
  items: Array<ValidTypes>;
  onCreate?: (name: string) => Promise<{ item: ValidTypes; message: string }>;
}
interface IFilterSelectProps
  extends Omit<ISelectProps, "onChange" | "items" | "onCreateOption"> {}

interface ISceneGallerySelect {
  initialId?: string;
  sceneId: string;
  onSelect: (
    item:
      | GQL.ValidGalleriesForSceneQuery["validGalleriesForScene"][0]
      | undefined
  ) => void;
}

const getSelectedValues = (selectedItems: ValueType<Option>) =>
  selectedItems
    ? (Array.isArray(selectedItems) ? selectedItems : [selectedItems]).map(
        (item) => item.value
      )
    : [];

const SelectComponent: React.FC<ISelectProps & ITypeProps> = ({
  type,
  initialIds,
  onChange,
  className,
  items,
  selectedOptions,
  isLoading,
  isDisabled = false,
  onCreateOption,
  isClearable = true,
  creatable = false,
  isMulti = false,
  onInputChange,
  placeholder,
  showDropdown = true,
  groupHeader,
  closeMenuOnSelect = true,
}) => {
  const defaultValue =
    items.filter((item) => initialIds?.indexOf(item.value) !== -1) ?? null;

  const options = groupHeader
    ? [
        {
          label: groupHeader,
          options: items,
        },
      ]
    : items;

  const styles = {
    option: (base: CSSProperties) => ({
      ...base,
      color: "#000",
    }),
    container: (base: CSSProperties, props: Props) => ({
      ...base,
      zIndex: props.isFocused ? 10 : base.zIndex,
    }),
    multiValueRemove: (base: CSSProperties, props: Props) => ({
      ...base,
      color: props.isFocused ? base.color : "#333333",
    }),
  };

  const props = {
    options,
    value: selectedOptions,
    className,
    classNamePrefix: "react-select",
    onChange,
    isMulti,
    isClearable,
    defaultValue,
    noOptionsMessage: () => (type !== "tags" ? "None" : null),
    placeholder: isDisabled ? "" : placeholder,
    onInputChange,
    isDisabled,
    isLoading,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    styles: styles as any, // TODO: Typing error, remove at some point
    closeMenuOnSelect,
    components: {
      IndicatorSeparator: () => null,
      ...((!showDropdown || isDisabled) && { DropdownIndicator: () => null }),
      ...(isDisabled && { MultiValueRemove: () => null }),
    },
  };

  return creatable ? (
    <CreatableSelect
      {...props}
      isDisabled={isLoading || isDisabled}
      onCreateOption={onCreateOption}
    />
  ) : (
    <Select {...props} />
  );
};

const FilterSelectComponent: React.FC<
  IFilterComponentProps & ITypeProps & IFilterSelectProps
> = (props) => {
  const [loading, setLoading] = useState(false);
  const selectedIds = props.ids ?? [];
  const Toast = useToast();

  const { items } = props;
  const options = items.map((i) => ({
    value: i.id,
    label: i.name ?? "",
  }));
  const selectedOptions = options.filter((option) =>
    selectedIds.includes(option.value)
  );

  const onChange = (selectedItems: ValueType<Option>) => {
    const selectedValues = getSelectedValues(selectedItems);
    props.onSelect?.(items.filter((item) => selectedValues.includes(item.id)));
  };

  const onCreate = async (name: string) => {
    try {
      setLoading(true);
      const { item: newItem, message } = await props.onCreate!(name);
      props.onSelect?.([
        ...items.filter((item) => selectedIds.includes(item.id)),
        newItem,
      ]);
      setLoading(false);
      Toast.success({
        content: (
          <span>
            {message}: <b>{name}</b>
          </span>
        ),
      });
    } catch (e) {
      Toast.error(e);
    }
  };

  return (
    <SelectComponent
      {...(props as ITypeProps)}
      {...(props as IFilterSelectProps)}
      isLoading={props.isLoading || loading}
      onChange={onChange}
      items={options}
      selectedOptions={selectedOptions}
      onCreateOption={props.creatable ? onCreate : undefined}
    />
  );
};

export const SceneGallerySelect: React.FC<ISceneGallerySelect> = (props) => {
  const [query, setQuery] = React.useState<string>("");
  const { data, loading } = useFindGalleries(getFilter());

  const galleries = data?.findGalleries.galleries ?? [];
  const items = galleries.map((g) => ({
    label: g.title ?? g.path ?? "",
    value: g.id,
  }));

  function getFilter() {
    const ret = new ListFilterModel(FilterMode.Galleries);
    ret.searchTerm = query;
    return ret;
  }

  const onInputChange = debounce((input: string) => {
    setQuery(input);
  }, 500);

  const onChange = (selectedItems: ValueType<Option>) => {
    const selectedItem = getSelectedValues(selectedItems)[0];
    props.onSelect(
      selectedItem ? galleries.find((g) => g.id === selectedItem) : undefined
    );
  };

  const selectedOptions: Option[] = props.initialId
    ? items.filter((item) => props.initialId?.indexOf(item.value) !== -1)
    : [];

  return (
    <SelectComponent
      onChange={onChange}
      onInputChange={onInputChange}
      isLoading={loading}
      items={items}
      selectedOptions={selectedOptions}
    />
  );
};

interface IScrapePerformerSuggestProps {
  scraperId: string;
  onSelectPerformer: (performer: GQL.ScrapedPerformerDataFragment) => void;
  placeholder?: string;
}
export const ScrapePerformerSuggest: React.FC<IScrapePerformerSuggestProps> = (
  props
) => {
  const [query, setQuery] = React.useState<string>("");
  const { data, loading } = useScrapePerformerList(props.scraperId, query);

  const performers = data?.scrapePerformerList ?? [];
  const items = performers.map((item) => ({
    label: item.name ?? "",
    value: item.name ?? "",
  }));

  const onInputChange = debounce((input: string) => {
    setQuery(input);
  }, 500);

  const onChange = (selectedItems: ValueType<Option>) => {
    const name = getSelectedValues(selectedItems)[0];
    const performer = performers.find((p) => p.name === name);
    if (performer) props.onSelectPerformer(performer);
  };

  return (
    <SelectComponent
      onChange={onChange}
      onInputChange={onInputChange}
      isLoading={loading}
      items={items}
      initialIds={[]}
      placeholder={props.placeholder}
      className="select-suggest"
      showDropdown={false}
    />
  );
};

interface IMarkerSuggestProps {
  initialMarkerTitle?: string;
  onChange: (title: string) => void;
}
export const MarkerTitleSuggest: React.FC<IMarkerSuggestProps> = (props) => {
  const { data, loading } = useMarkerStrings();
  const suggestions = data?.markerStrings ?? [];

  const onChange = (selectedItems: ValueType<Option>) =>
    props.onChange(getSelectedValues(selectedItems)[0]);

  const items = suggestions.map((item) => ({
    label: item?.title ?? "",
    value: item?.title ?? "",
  }));
  const initialIds = props.initialMarkerTitle ? [props.initialMarkerTitle] : [];
  return (
    <SelectComponent
      creatable
      onChange={onChange}
      isLoading={loading}
      items={items}
      initialIds={initialIds}
      placeholder="Marker title..."
      className="select-suggest"
      showDropdown={false}
      groupHeader="Previously used titles..."
    />
  );
};

export const PerformerSelect: React.FC<IFilterProps> = (props) => {
  const { data, loading } = useAllPerformersForFilter();
  const [createPerformer] = usePerformerCreate();

  const performers = data?.allPerformersSlim ?? [];

  const onCreate = async (name: string) => {
    const result = await createPerformer({
      variables: { name },
    });
    return {
      item: result.data!.performerCreate!,
      message: "Created performer",
    };
  };

  return (
    <FilterSelectComponent
      {...props}
      creatable
      onCreate={onCreate}
      type="performers"
      isLoading={loading}
      items={performers}
      placeholder={props.noSelectionString ?? "Select performer..."}
    />
  );
};

export const StudioSelect: React.FC<IFilterProps> = (props) => {
  const { data, loading } = useAllStudiosForFilter();
  const [createStudio] = useStudioCreate({ name: "" });

  const studios = data?.allStudiosSlim ?? [];

  const onCreate = async (name: string) => {
    const result = await createStudio({ variables: { name } });
    return { item: result.data!.studioCreate!, message: "Created studio" };
  };

  return (
    <FilterSelectComponent
      {...props}
      type="studios"
      isLoading={loading}
      items={studios}
      placeholder={props.noSelectionString ?? "Select studio..."}
      creatable
      onCreate={onCreate}
    />
  );
};

export const MovieSelect: React.FC<IFilterProps> = (props) => {
  const { data, loading } = useAllMoviesForFilter();
  const items = data?.allMoviesSlim ?? [];

  return (
    <FilterSelectComponent
      {...props}
      type="movies"
      isLoading={loading}
      items={items}
      placeholder={props.noSelectionString ?? "Select movie..."}
    />
  );
};

export const TagSelect: React.FC<IFilterProps> = (props) => {
  const { data, loading } = useAllTagsForFilter();
  const [createTag] = useTagCreate({ name: "" });
  const placeholder = props.noSelectionString ?? "Select tags...";

  const tags = data?.allTagsSlim ?? [];

  const onCreate = async (name: string) => {
    const result = await createTag({
      variables: { name },
    });
    return { item: result.data!.tagCreate!, message: "Created tag" };
  };

  return (
    <FilterSelectComponent
      {...props}
      items={tags}
      creatable
      type="tags"
      placeholder={placeholder}
      isLoading={loading}
      onCreate={onCreate}
      closeMenuOnSelect={false}
    />
  );
};

export const FilterSelect: React.FC<IFilterProps & ITypeProps> = (props) =>
  props.type === "performers" ? (
    <PerformerSelect {...(props as IFilterProps)} />
  ) : props.type === "studios" || props.type === "parent_studios" ? (
    <StudioSelect {...(props as IFilterProps)} />
  ) : props.type === "movies" ? (
    <MovieSelect {...(props as IFilterProps)} />
  ) : (
    <TagSelect {...(props as IFilterProps)} />
  );
