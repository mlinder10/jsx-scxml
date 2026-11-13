/** @jsxImportSource ../src/core */
import { describe, expect, it } from "vitest";
import {
  expr,
  ScxmlChild,
  ScxmlNode,
  serialize,
  validate,
} from "../src/index.js";

describe("JSX SCXML runtime", () => {
  it("serializes composed JSX into pretty SCXML", () => {
    const document = (
      <scxml initial="idle" version="1.0">
        <state id="idle">
          <transition event="START" target="running" />
        </state>
        <state id="running">
          <onentry>
            <log label="Lifecycle" expr={expr`'Started'`} />
          </onentry>
          <transition event="STOP" target="idle" />
        </state>
      </scxml>
    ) as ScxmlNode;

    expect(serialize(document, { xmlDeclaration: true }))
      .toBe(`<?xml version="1.0" encoding="UTF-8"?>
<scxml initial="idle" version="1.0">
  <state id="idle">
    <transition event="START" target="running"/>
  </state>
  <state id="running">
    <onentry>
      <log label="Lifecycle" expr="'Started'"/>
    </onentry>
    <transition event="STOP" target="idle"/>
  </state>
</scxml>`);
  });

  it("expands function components with props and children", () => {
    function LoadingState(props: { done: string; children?: ScxmlChild }) {
      return (
        <state id="loading">
          <onentry>
            <send event="FETCH" />
          </onentry>
          {props.children}
          <transition event="DONE" target={props.done} />
        </state>
      );
    }

    const document = (
      <scxml initial="loading">
        <LoadingState done="ready">
          <log label="Loading" />
        </LoadingState>
        <final id="ready" />
      </scxml>
    ) as ScxmlNode;

    expect(serialize(document)).toContain('<state id="loading">');
    expect(serialize(document)).toContain('<log label="Loading"/>');
    expect(validate(document).valid).toBe(true);
  });

  it("flattens fragments and conditional children", () => {
    const states = ["one", "two"];
    const document = (
      <scxml initial="one">
        <>
          {states.map((id) => (
            <state id={id} />
          ))}
          {false}
        </>
      </scxml>
    ) as ScxmlNode;

    expect(serialize(document)).toContain('<state id="one"/>');
    expect(validate(document).valid).toBe(true);
  });

  it("reports invalid state targets", () => {
    const document = (
      <scxml>
        <state id="idle">
          <transition target="missing" />
        </state>
      </scxml>
    ) as ScxmlNode;

    expect(validate(document).diagnostics).toContainEqual(
      expect.objectContaining({ code: "unknown-target" }),
    );
  });
});
