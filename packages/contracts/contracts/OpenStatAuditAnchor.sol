// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract OpenStatAuditAnchor {
    enum AuditOutcome {
        Unknown,
        Pass,
        Warning,
        Fail
    }

    struct AuditAnchor {
        address submitter;
        bytes32 telemetryDigest;
        bytes32 insightDigest;
        AuditOutcome outcome;
        uint256 anchoredAt;
    }

    error AuditAlreadyAnchored(address submitter, bytes32 runRef);
    error InvalidDigest();
    error InvalidOutcome(uint8 outcome);
    error InvalidRunRef();

    event AuditAnchored(
        address indexed submitter,
        bytes32 indexed runRef,
        bytes32 indexed telemetryDigest,
        bytes32 insightDigest,
        uint8 outcome,
        uint256 anchoredAt
    );

    mapping(address submitter => mapping(bytes32 runRef => AuditAnchor))
        private audits;

    function anchorAudit(
        bytes32 runRef,
        bytes32 telemetryDigest,
        bytes32 insightDigest,
        uint8 outcome
    ) external {
        if (runRef == bytes32(0)) {
            revert InvalidRunRef();
        }
        if (telemetryDigest == bytes32(0) || insightDigest == bytes32(0)) {
            revert InvalidDigest();
        }
        if (outcome > uint8(AuditOutcome.Fail)) {
            revert InvalidOutcome(outcome);
        }
        if (audits[msg.sender][runRef].anchoredAt != 0) {
            revert AuditAlreadyAnchored(msg.sender, runRef);
        }

        uint256 anchoredAt = block.timestamp;
        audits[msg.sender][runRef] = AuditAnchor({
            submitter: msg.sender,
            telemetryDigest: telemetryDigest,
            insightDigest: insightDigest,
            outcome: AuditOutcome(outcome),
            anchoredAt: anchoredAt
        });

        emit AuditAnchored(
            msg.sender,
            runRef,
            telemetryDigest,
            insightDigest,
            outcome,
            anchoredAt
        );
    }

    function getAudit(
        address submitter,
        bytes32 runRef
    ) external view returns (AuditAnchor memory) {
        return audits[submitter][runRef];
    }
}
