using UnrealBuildTool;

public class SEEDGenesis : ModuleRules
{
    public SEEDGenesis(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core", "CoreUObject", "Engine", "InputCore", "ProceduralMeshComponent"
        });
    }
}
