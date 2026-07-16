using UnrealBuildTool;
using System.Collections.Generic;

public class SEEDGenesisEditorTarget : TargetRules
{
    public SEEDGenesisEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("SEEDGenesis");
    }
}
