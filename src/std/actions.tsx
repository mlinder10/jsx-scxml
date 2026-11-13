/** @jsxImportSource jsx-scxml/swampfox */

import type { Jexl } from "../jexl/index.js";
import { StdBaseNode } from "./node.js";
import type { TransitionProps } from "./transition.js";
import type { NodeProps, Source } from "./types.js";

export type ScriptProps = NodeProps & {
  readonly inline?: Jexl;
  readonly src?: string;
  readonly srcExpr?: Jexl;
};

export function Script({ inline, src, srcExpr, ...props }: ScriptProps) {
  return (
    <StdBaseNode nodeType="Script" {...props}>
      {srcExpr && <sf:script src="" srcexpr={srcExpr} />}
      {inline && <script>{inline}</script>}
      {src && <script src={src} />}
    </StdBaseNode>
  );
}

export type AssignResultsProps = NodeProps & {
  readonly results: Readonly<Record<string, Jexl>>;
};

export function AssignResults({ results, ...props }: AssignResultsProps) {
  return (
    <StdBaseNode nodeType="Assign" {...props}>
      {Object.entries(results).map(([name, source]) => (
        <sf:assignResult key={name} name={name} srcexpr={source} />
      ))}
    </StdBaseNode>
  );
}

export type LanguageProps = NodeProps & {
  readonly language: string;
};

export function Language({ language, ...props }: LanguageProps) {
  return (
    <StdBaseNode nodeType="Language" {...props}>
      <sf:language src={language} />
    </StdBaseNode>
  );
}

export type AnnouncementProps = NodeProps & Source;

export function Announcement({ src, srcExpr, ...props }: AnnouncementProps) {
  return (
    <StdBaseNode nodeType="Announcement" {...props}>
      <sf:announcement src={src ?? ""} srcexpr={srcExpr ?? ""} />
    </StdBaseNode>
  );
}

export type SetIntentProps = NodeProps &
  Source & {
    readonly immediate?: boolean;
  };

export function SetIntent({
  src,
  srcExpr,
  immediate = false,
  ...props
}: SetIntentProps) {
  return (
    <StdBaseNode nodeType="Intent" {...props}>
      <sf:intent
        src={src ?? ""}
        srcexpr={srcExpr ?? ""}
        immediate={immediate ? "true" : "false"}
      />
    </StdBaseNode>
  );
}

export type DisconnectProps = NodeProps;

export function Disconnect(props: DisconnectProps) {
  return (
    <StdBaseNode nodeType="Disconnect" {...props}>
      <sf:disconnect />
    </StdBaseNode>
  );
}

type ModuleBaseProps = NodeProps &
  Source & {
    readonly nameList?: string;
    readonly result?: string;
  };

export type ModuleProps = ModuleBaseProps;

export function Module({
  src,
  srcExpr,
  nameList,
  result = "lastResult",
  ...props
}: ModuleProps) {
  return (
    <StdBaseNode nodeType="Module" {...props}>
      <sf:module
        src={src ?? ""}
        srcexpr={srcExpr ?? ""}
        namelist={nameList ?? ""}
        result={result}
      />
    </StdBaseNode>
  );
}

export type FILOfferProps = ModuleBaseProps;

export function FILOffer({
  src,
  srcExpr,
  nameList,
  result = "lastResult",
  ...props
}: FILOfferProps) {
  return (
    <StdBaseNode nodeType="FILOffer" {...props}>
      <sf:filOffer
        src={src ?? ""}
        srcexpr={srcExpr ?? ""}
        namelist={nameList ?? ""}
        result={result}
      />
    </StdBaseNode>
  );
}

export type BranchProps = Omit<NodeProps, "to"> & {
  children:
    ReturnType<typeof BranchTransition> | ReturnType<typeof BranchTransition>[];
};

export function Branch({ children, ...props }: BranchProps) {
  return (
    <StdBaseNode nodeType="Branch" {...props} isBranch>
      {children}
    </StdBaseNode>
  );
}

export type BranchTransitionProps = TransitionProps;

export function BranchTransition({
  label,
  cond,
  to,
  script,
}: BranchTransitionProps) {
  const transitionProps =
    cond === "Else" ? { target: to.id } : { cond, target: to.id };
  return (
    <transition {...transitionProps} metadata={JSON.stringify({ label })}>
      <assign location="branchLabel" expr={`'${label}'`} />
      {script && <script>{script}</script>}
    </transition>
  );
}
