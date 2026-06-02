from openstat.cli import main
from openstat.scaffold import SCAFFOLD_FILES, scaffold_project


def test_scaffold_project_creates_starter_files(tmp_path):
    result = scaffold_project(tmp_path)

    assert {path.name for path in result.created} == set(SCAFFOLD_FILES)
    assert result.skipped == ()
    assert (tmp_path / ".env.openstat.example").read_text(encoding="utf-8").startswith(
        "# Copy these values"
    )
    assert "create_openstat_client" in (
        tmp_path / "openstat_integration.py"
    ).read_text(encoding="utf-8")


def test_scaffold_project_does_not_overwrite_existing_files_by_default(tmp_path):
    integration_path = tmp_path / "openstat_integration.py"
    integration_path.write_text("# keep me\n", encoding="utf-8")

    result = scaffold_project(tmp_path)

    assert integration_path in result.skipped
    assert integration_path.read_text(encoding="utf-8") == "# keep me\n"


def test_scaffold_project_force_overwrites_existing_files(tmp_path):
    integration_path = tmp_path / "openstat_integration.py"
    integration_path.write_text("# replace me\n", encoding="utf-8")

    result = scaffold_project(tmp_path, force=True)

    assert integration_path in result.created
    assert integration_path.read_text(encoding="utf-8") == SCAFFOLD_FILES[
        "openstat_integration.py"
    ]


def test_cli_init_scaffolds_selected_path(tmp_path, capsys):
    result = main(["init", "--path", str(tmp_path)])

    assert result == 0
    assert (tmp_path / "OPENSTAT.md").exists()
    assert "OpenStat starter files are ready." in capsys.readouterr().out
