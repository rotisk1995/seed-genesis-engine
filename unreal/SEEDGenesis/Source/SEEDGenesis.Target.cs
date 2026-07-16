using UnrealBuildTool;
using System.Collections.Generic;

public class SEEDGenesisTarget : TargetRules
{
    public SEEDGenesisTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("SEEDGenesis");
    }
}
