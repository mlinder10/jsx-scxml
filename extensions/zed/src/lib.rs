use std::collections::BTreeMap;
use zed::settings::{CommandSettings, LspSettings};
use zed_extension_api as zed;

const SERVER_BINARY: &str = "jsx-scxml-jexl-language-server";

struct JsxScxmlJexl;

fn server_command(
    binary: Option<CommandSettings>,
    shell_env: zed::EnvVars,
    find_binary: impl FnOnce(&str) -> Option<String>,
) -> zed::Result<zed::Command> {
    let (path, arguments, overrides) = match binary {
        Some(binary) => (binary.path, binary.arguments, binary.env),
        None => (None, None, None),
    };
    let command = match path {
        Some(path) => path,
        None => find_binary(SERVER_BINARY).ok_or_else(|| {
            format!(
                "Could not find {SERVER_BINARY} on the worktree PATH. \
                 Configure lsp.jsx-scxml-jexl.binary.path as node (or its absolute path) \
                 and binary.arguments as [\"/absolute/path/to/extensions/language-server/out/src/server.js\", \
                 \"--stdio\"], after building the shared server and installing its dependencies there. \
                 See the Zed extension README. No npm package is downloaded automatically."
            )
        })?,
    };

    // Deduplicate before merging so an inherited value cannot shadow an explicit override.
    let mut env: BTreeMap<_, _> = shell_env.into_iter().collect();
    env.extend(overrides.unwrap_or_default());

    Ok(zed::Command {
        command,
        args: arguments.unwrap_or_else(|| vec!["--stdio".into()]),
        env: env.into_iter().collect(),
    })
}

impl zed::Extension for JsxScxmlJexl {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        let settings = LspSettings::for_worktree(language_server_id.as_ref(), worktree)?;
        server_command(settings.binary, worktree.shell_env(), |name| {
            worktree.which(name)
        })
    }

    fn language_server_initialization_options(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<Option<zed::serde_json::Value>> {
        Ok(
            LspSettings::for_worktree(language_server_id.as_ref(), worktree)?
                .initialization_options,
        )
    }
}

zed::register_extension!(JsxScxmlJexl);

#[cfg(test)]
mod tests {
    use super::*;
    use zed::serde_json::json;

    fn binary(value: zed::serde_json::Value) -> Option<CommandSettings> {
        Some(zed::serde_json::from_value(value).unwrap())
    }

    #[test]
    fn defaults_to_worktree_binary_and_stdio() {
        let command = server_command(None, vec![], |name| {
            assert_eq!(name, SERVER_BINARY);
            Some("/tools/jsx-scxml-jexl-language-server".into())
        })
        .unwrap();
        assert_eq!(command.command, "/tools/jsx-scxml-jexl-language-server");
        assert_eq!(command.args, ["--stdio"]);
    }

    #[test]
    fn explicit_path_and_arguments_are_used_verbatim() {
        let command = server_command(
            binary(json!({
                "path": "node",
                "arguments": ["/project with spaces/out/src/server.js", "--stdio", "custom"]
            })),
            vec![],
            |_| panic!("an explicit path must bypass discovery"),
        )
        .unwrap();
        assert_eq!(command.command, "node");
        assert_eq!(
            command.args,
            [
                "/project with spaces/out/src/server.js",
                "--stdio",
                "custom"
            ]
        );
    }

    #[test]
    fn explicit_empty_arguments_do_not_get_defaults() {
        let command = server_command(
            binary(json!({"path": "/tools/wrapper", "arguments": []})),
            vec![],
            |_| None,
        )
        .unwrap();
        assert!(command.args.is_empty());
    }

    #[test]
    fn partial_overrides_keep_discovery_and_replace_inherited_environment() {
        let command = server_command(
            binary(json!({
                "arguments": ["custom"],
                "env": {"PATH": "/custom/bin", "NEW": "value", "EMPTY": ""}
            })),
            vec![
                ("PATH".into(), "/inherited/bin".into()),
                ("KEEP".into(), "inherited".into()),
            ],
            |_| Some("/tools/server".into()),
        )
        .unwrap();
        assert_eq!(command.command, "/tools/server");
        assert_eq!(command.args, ["custom"]);
        let env: BTreeMap<_, _> = command.env.iter().cloned().collect();
        assert_eq!(env["PATH"], "/custom/bin");
        assert_eq!(env["KEEP"], "inherited");
        assert_eq!(env["NEW"], "value");
        assert_eq!(env["EMPTY"], "");
        assert_eq!(command.env.len(), env.len());
    }

    #[test]
    fn missing_binary_explains_local_configuration() {
        let error = server_command(None, vec![], |_| None).unwrap_err();
        assert!(error.contains("lsp.jsx-scxml-jexl.binary.path"));
        assert!(error.contains("out/src/server.js"));
        assert!(error.contains("No npm package is downloaded"));
    }
}
