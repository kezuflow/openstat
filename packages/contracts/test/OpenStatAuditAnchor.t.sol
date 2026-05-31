// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { OpenStatAuditAnchor } from "../contracts/OpenStatAuditAnchor.sol";

contract AuditSubmitter {
    function anchor(
        OpenStatAuditAnchor target,
        bytes32 runRef,
        bytes32 telemetryDigest,
        bytes32 insightDigest,
        uint8 outcome
    ) external {
        target.anchorAudit(runRef, telemetryDigest, insightDigest, outcome);
    }
}

contract OpenStatAuditAnchorTest {
    bytes32 private constant RUN_REF = keccak256("run-demo");
    bytes32 private constant TELEMETRY_DIGEST = keccak256("telemetry");
    bytes32 private constant INSIGHT_DIGEST = keccak256("insight");

    function test_AnchorAuditStoresCommitment() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();

        target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 1);
        OpenStatAuditAnchor.AuditAnchor memory stored = target.getAudit(
            address(this),
            RUN_REF
        );

        require(stored.submitter == address(this), "submitter mismatch");
        require(
            stored.telemetryDigest == TELEMETRY_DIGEST,
            "telemetry mismatch"
        );
        require(stored.insightDigest == INSIGHT_DIGEST, "insight mismatch");
        require(uint8(stored.outcome) == 1, "outcome mismatch");
        require(stored.anchoredAt > 0, "timestamp missing");
    }

    function test_RevertWhenRunRefIsZero() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();

        try target.anchorAudit(bytes32(0), TELEMETRY_DIGEST, INSIGHT_DIGEST, 1) {
            revert("expected revert");
        } catch {}
    }

    function test_RevertWhenTelemetryDigestIsZero() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();

        try target.anchorAudit(RUN_REF, bytes32(0), INSIGHT_DIGEST, 1) {
            revert("expected revert");
        } catch {}
    }

    function test_RevertWhenInsightDigestIsZero() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();

        try target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, bytes32(0), 1) {
            revert("expected revert");
        } catch {}
    }

    function test_RevertWhenOutcomeIsInvalid() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();

        try target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 4) {
            revert("expected revert");
        } catch {}
    }

    function test_RevertWhenCallerOverwritesAudit() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();
        target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 1);

        try target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 2) {
            revert("expected revert");
        } catch {}
    }

    function test_DifferentCallersCanUseSameRunRef() public {
        OpenStatAuditAnchor target = new OpenStatAuditAnchor();
        AuditSubmitter other = new AuditSubmitter();

        target.anchorAudit(RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 1);
        other.anchor(target, RUN_REF, TELEMETRY_DIGEST, INSIGHT_DIGEST, 2);

        require(
            target.getAudit(address(this), RUN_REF).anchoredAt > 0,
            "caller audit missing"
        );
        require(
            target.getAudit(address(other), RUN_REF).anchoredAt > 0,
            "other audit missing"
        );
    }
}
